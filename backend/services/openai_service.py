"""
Zynex Streaming Chat Service
Proxies chat requests to OpenRouter (OpenAI-compatible) with SSE streaming.
Falls back to demo mode when no API key is configured.
"""

from __future__ import annotations

import asyncio
import json
from openai import AsyncOpenAI

from backend.config import get_settings

_DEMO_RESPONSES = [
    "That's a great question! ",
    "Let me think about this carefully.\n\n",
    "Based on my analysis, here are the key points:\n\n",
    "**1. Context & Background**\n",
    "This topic involves several interconnected concepts ",
    "that have evolved significantly over time. ",
    "Understanding the fundamentals is crucial.\n\n",
    "**2. Key Insights**\n",
    "- The most important factor is consistency and clarity\n",
    "- Research shows that iterative approaches yield the best results\n",
    "- Collaboration and feedback loops accelerate progress\n\n",
    "**3. Practical Recommendations**\n",
    "I'd suggest starting with a clear goal, ",
    "breaking it into manageable steps, ",
    "and measuring progress along the way.\n\n",
    "Let me know if you'd like me to dive deeper into any of these points!",
    "\n\n---\n*Running in demo mode — ",
    "activate free AI via the setup banner for real responses.*",
]


async def stream_chat(messages: list, model: str = "", stream: bool = True):
    """
    Stream a chat completion from OpenRouter.
    Falls back to simulated streaming in demo mode.
    """
    s = get_settings()

    if s.demo_mode:
        for chunk in _DEMO_RESPONSES:
            yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]})}\n\n"
            await asyncio.sleep(0.05)
        yield "data: [DONE]\n\n"
        return

    chosen_model = model or s.DEFAULT_MODEL

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=s.OPENROUTER_API_KEY,
        timeout=60.0,
    )

    if not stream:
        response = await client.chat.completions.create(
            model=chosen_model,
            messages=messages,
            max_tokens=4096,
            extra_headers={
                "HTTP-Referer": "https://zynex.ai",
                "X-Title": "Zynex AI",
            },
        )
        content = response.choices[0].message.content or ""
        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]})}\n\n"
        yield "data: [DONE]\n\n"
        return

    response = await client.chat.completions.create(
        model=chosen_model,
        messages=messages,
        max_tokens=4096,
        stream=True,
        extra_headers={
            "HTTP-Referer": "https://zynex.ai",
            "X-Title": "Zynex AI",
        },
    )

    async for chunk in response:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield f"data: {json.dumps({'choices': [{'delta': {'content': delta}}]})}\n\n"
    yield "data: [DONE]\n\n"
