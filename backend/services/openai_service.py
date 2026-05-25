import json
from openai import AsyncOpenAI
from backend.config import settings

async def stream_chat(messages, model="gpt-4o", stream=True):
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    if not stream:
        # Non-streaming fallback
        response = await client.chat.completions.create(
            model=model, messages=messages, max_tokens=settings.max_tokens
        )
        content = response.choices[0].message.content
        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
        yield "data: [DONE]\n\n"
        return
    
    async with client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=settings.max_tokens,
        stream=True,
    ) as response:
        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'choices': [{'delta': {'content': delta}}]})}\n\n"
    yield "data: [DONE]\n\n"
