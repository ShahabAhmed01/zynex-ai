"""Health and readiness endpoints."""

from fastapi import APIRouter, Query

from backend import __version__
from backend.config import get_settings
from backend.services import llm_client

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Liveness probe and non-secret runtime summary."""
    settings = get_settings()
    return {
        "status": "healthy",
        "version": __version__,
        "app": "Zynex",
        "demo_mode": settings.demo_mode,
        "llm_model": settings.DEFAULT_MODEL,
        "llm_configured": settings.has_api_key,
    }


@router.get("/health/llm")
async def health_llm(verify: bool = Query(False, description="Run a live OpenRouter ping")) -> dict:
    """LLM status. Pass ?verify=true for a live OpenRouter ping (requires API key)."""
    settings = get_settings()
    payload = {
        "demo_mode": settings.demo_mode,
        "llm_model": settings.DEFAULT_MODEL,
        "llm_configured": settings.has_api_key,
    }
    if verify:
        payload["verification"] = await llm_client.verify_connection()
    return payload
