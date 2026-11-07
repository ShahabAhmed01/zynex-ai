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
import os
import re
from pathlib import Path
from urllib.parse import quote, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend import __version__
from backend.config import FREE_MODELS, get_settings, reload_settings
from backend.middleware.rate_limit import limiter

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
@limiter.limit("10/minute")
async def get_auth_url(request: Request, callback_url: str) -> AuthURLResponse:
    """
    Return the OpenRouter auth URL that the frontend should open.

    The callback_url is the page on this app that OpenRouter will redirect to.
    """
    settings = get_settings()
    if settings.has_api_key:
        raise HTTPException(
            status_code=400,
            detail="API key already configured — no activation needed.",
        )

    parsed = urlparse(callback_url)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or len(callback_url) > 2048
        or any(char.isspace() for char in callback_url)
    ):
        raise HTTPException(status_code=400, detail="Invalid callback URL.")

    auth_url = "https://openrouter.ai/auth" f"?callback_url={quote(callback_url, safe='')}"
    return AuthURLResponse(url=auth_url, demo_mode=settings.demo_mode)


@router.post("/auth/callback", response_model=CallbackResponse)
@limiter.limit("10/minute")
async def handle_callback(request: Request, req: CallbackRequest) -> CallbackResponse:
    """
    Exchange the code from OpenRouter for an API key.
    Saves the key to .env and reloads the app config in-memory.
    """
    settings = get_settings()
    if settings.has_api_key:
        return CallbackResponse(ok=True, message="API key already configured.")

    code = req.code.strip()
    if not code or len(code) > 2048 or any(char.isspace() for char in code):
        raise HTTPException(status_code=400, detail="Invalid authorization code.")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/auth/keys",
                json={"code": code},
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "OpenRouter key exchange failed: HTTP %s",
            exc.response.status_code,
        )
        raise HTTPException(
            status_code=502,
            detail="OpenRouter rejected the authorization code. Please try again.",
        ) from exc
    except httpx.RequestError as exc:
        logger.error("OpenRouter key exchange network error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach OpenRouter.") from exc

    api_key = str(data.get("key", "")).strip()
    if not api_key:
        raise HTTPException(status_code=502, detail="OpenRouter did not return a key.")

    _save_key_to_env(api_key)
    reload_settings()

    logger.info("OpenRouter API key provisioned successfully")
    return CallbackResponse(ok=True, message="API key activated — you now have live AI access.")


@router.get("/config")
async def get_config() -> dict:
    """Expose non-secret config to the frontend."""
    settings = get_settings()
    return {
        "demo_mode": settings.demo_mode,
        "has_api_key": settings.has_api_key,
        "default_model": settings.DEFAULT_MODEL,
        "max_tokens": settings.MAX_TOKENS,
        "free_models": list(FREE_MODELS),
        "version": __version__,
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _validate_api_key(api_key: str) -> str:
    """Reject keys that could corrupt the .env file."""
    if not re.fullmatch(r"[A-Za-z0-9._~-]{20,300}", api_key):
        raise HTTPException(
            status_code=502,
            detail="OpenRouter returned a malformed API key.",
        )
    return api_key


def _save_key_to_env(api_key: str) -> None:
    """Append or update OPENROUTER_API_KEY in the .env file."""
    api_key = _validate_api_key(api_key)
    env_path = _ENV_FILE

    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        lines = content.splitlines()
        new_lines = []
        found = False
        for line in lines:
            if line.strip().startswith("OPENROUTER_API_KEY"):
                new_lines.append(f"OPENROUTER_API_KEY={api_key}")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f"OPENROUTER_API_KEY={api_key}")
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    else:
        env_path.write_text(
            "# Auto-provisioned by Zynex OAuth flow\n"
            f"OPENROUTER_API_KEY={api_key}\n",
            encoding="utf-8",
        )

    # Keep the key unreadable by other OS users where supported.
    if os.name != "nt":
        try:
            env_path.chmod(0o600)
        except OSError as exc:
            logger.warning("Could not restrict .env permissions: %s", exc)

    logger.info("Saved a provisioned API key to .env")
