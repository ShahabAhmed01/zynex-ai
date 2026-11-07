"""Chat API route."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.middleware.rate_limit import limiter
from backend.services.openai_service import stream_chat

router = APIRouter()


class ChatMessage(BaseModel):
    """One message in a chat completion request."""

    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str = Field(..., min_length=1, max_length=32_000)


class ChatRequest(BaseModel):
    """Incoming chat request from the frontend."""

    messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
    model: str = ""
    stream: bool = True


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_endpoint(request: Request, req: ChatRequest) -> StreamingResponse:
    """Stream a chat completion over Server-Sent Events."""
    model = req.model.strip() or get_settings().DEFAULT_MODEL
    return StreamingResponse(
        stream_chat([message.model_dump() for message in req.messages], model, req.stream),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # important for nginx proxies
        },
    )
