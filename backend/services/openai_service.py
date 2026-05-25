import json
import os
from openai import AsyncOpenAI
from backend.config import settings

async def stream_chat(messages, model="google/gemini-2.0-flash-001", stream=True):
    api_key = getattr(settings, "OPENROUTER_API_KEY", "")
    
    if api_key:
        base_url = "https://openrouter.ai/api/v1"
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    else:
        # Demo mode fallback using Pollinations AI
        client = AsyncOpenAI(api_key="dummy", base_url="https://text.pollinations.ai/openai")
        model = "openai"  # Force pollinations default model
    
    if not stream:
        # Non-streaming fallback
        response = await client.chat.completions.create(
            model=model, messages=messages, max_tokens=2048
        )
        content = response.choices[0].message.content
        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
        yield "data: [DONE]\n\n"
        return
    
    async with client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=2048,
        stream=True,
    ) as response:
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': delta}}]})}\n\n"
    yield "data: [DONE]\n\n"
