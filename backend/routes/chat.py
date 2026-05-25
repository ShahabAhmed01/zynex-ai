from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.responses import StreamingResponse
from backend.services.openai_service import stream_chat

router = APIRouter()

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    model: str = "gpt-4o"
    stream: bool = True

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    return StreamingResponse(
        stream_chat(req.messages, req.model, req.stream),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # important for nginx proxies
        }
    )
