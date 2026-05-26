"""
OpenRouter OAuth PKCE Integration
Allows users to provision an API key directly from the web UI
without ever touching the .env file or visiting OpenRouter manually.

Flow:
  1. Frontend calls GET /api/auth/url?callback_url=…
  2. Backend returns the OpenRouter auth URL
  3. User authenticates on OpenRouter (popup / redirect)
  4. OpenRouter redirects to the callback_url with ?code=…
  5. Frontend sends code to POST /api/auth/callback
  6. Backend exchanges code for API key, saves to .env, reloads config
"""

from __future__ import annotations

import logging
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import get_settings, reload_settings

logger = logging.getLogger("zynex.auth")

router = APIRouter()

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


# ── Request / Response models ────────────────────────────────────────────────

class CallbackRequest(BaseModel):
    code: str


class AuthURLResponse(BaseModel):
    url: str
    demo_mode: bool


class CallbackResponse(BaseModel):
    ok: bool
    message: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/auth/url", response_model=AuthURLResponse)
async def get_auth_url(callback_url: str):
    """
    Return the OpenRouter auth URL that the frontend should open.
    The callback_url is the page on *this* app that OpenRouter will redirect to.
    """
    s = get_settings()
    if s.has_api_key:
        raise HTTPException(
            status_code=400,
            detail="API key already configured — no activation needed.",
        )

    auth_url = (
        "https://openrouter.ai/auth"
        f"?callback_url={quote(callback_url, safe='')}"
    )
    return AuthURLResponse(url=auth_url, demo_mode=s.demo_mode)


@router.post("/auth/callback", response_model=CallbackResponse)
async def handle_callback(req: CallbackRequest):
    """
    Exchange the code from OpenRouter for an API key.
    Saves the key to .env and reloads the app config in-memory.
    """
    s = get_settings()
    if s.has_api_key:
        return CallbackResponse(ok=True, message="API key already configured.")

    # Exchange code for API key
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/auth/keys",
                json={"code": req.code},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("OpenRouter key exchange failed: %s %s", exc.response.status_code, exc.response.text)
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter returned {exc.response.status_code}: {exc.response.text}",
        )
    except httpx.RequestError as exc:
        logger.error("OpenRouter key exchange network error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach OpenRouter.")

    api_key = data.get("key", "")
    if not api_key:
        raise HTTPException(status_code=502, detail="OpenRouter did not return a key.")

    # Save to .env
    _save_key_to_env(api_key)

    # Reload config in-memory
    reload_settings()

    masked = api_key[:8] + "..." + api_key[-4:]
    logger.info("API key provisioned successfully: %s", masked)

    return CallbackResponse(ok=True, message="API key activated! You now have free AI access.")


@router.get("/config")
async def get_config():
    """Expose non-secret config to the frontend."""
    s = get_settings()
    return {
        "demo_mode": s.demo_mode,
        "has_api_key": s.has_api_key,
        "default_model": s.DEFAULT_MODEL,
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _save_key_to_env(api_key: str) -> None:
    """Append or update OPENROUTER_API_KEY in the .env file."""
    env_path = _ENV_FILE

    if env_path.exists():
        content = env_path.read_text()
        lines = content.splitlines()
        new_lines = []
        found = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("OPENROUTER_API_KEY"):
                new_lines.append(f"OPENROUTER_API_KEY={api_key}")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f"OPENROUTER_API_KEY={api_key}")
        env_path.write_text("\n".join(new_lines) + "\n")
    else:
        env_path.write_text(
            "# Auto-provisioned by Zynex OAuth flow\n"
            f"OPENROUTER_API_KEY={api_key}\n"
        )

    logger.info("Saved API key to %s", env_path)
