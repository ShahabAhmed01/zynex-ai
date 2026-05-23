from fastapi import APIRouter, Query

from backend.config import settings
from backend.services import llm_client

router = APIRouter()


@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "app": "Zynex",
        "demo_mode": settings.demo_mode,
        "llm_model": settings.DEFAULT_MODEL,
        "llm_configured": settings.has_api_key,
    }


@router.get("/api/health/llm")
async def health_llm(verify: bool = Query(False, description="Run a live OpenRouter ping")):
    """LLM status. Pass ?verify=true for a live OpenRouter ping (requires API key)."""
    payload = {
        "demo_mode": settings.demo_mode,
        "llm_model": settings.DEFAULT_MODEL,
        "llm_configured": settings.has_api_key,
    }
    if verify:
        payload["verification"] = await llm_client.verify_connection()
    return payload
