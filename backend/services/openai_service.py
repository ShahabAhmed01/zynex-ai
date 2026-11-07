"""
Zynex Streaming Chat Service
Proxies chat requests to OpenRouter (OpenAI-compatible) with SSE streaming.
Falls back to a simulated stream only when no API key is configured.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from backend.config import get_settings

logger = logging.getLogger("zynex.chat")

_REPO_URL = "https://github.com/ShahabAhmed01/zynex-ai"

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
    "click “Activate free AI” in the banner for real responses.*",
]


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def stream_chat(
    messages: list[dict],
    model: str = "",
    stream: bool = True,
) -> AsyncIterator[str]:
    """
    Stream a chat completion from OpenRouter.

    In demo mode a short simulated stream is returned. In real mode an error
    from the provider is surfaced to the client instead of being replaced with
    fabricated content.
    """
    settings = get_settings()

    if settings.demo_mode:
        for chunk in _DEMO_RESPONSES:
            yield _sse({"choices": [{"delta": {"content": chunk}}]})
            await asyncio.sleep(0.05)
        yield "data: [DONE]\n\n"
        return

    chosen_model = model or settings.DEFAULT_MODEL

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
        timeout=60.0,
    )

    try:
        if not stream:
            response = await client.chat.completions.create(
                model=chosen_model,
                messages=messages,
                max_tokens=settings.MAX_TOKENS,
                extra_headers={
                    "HTTP-Referer": _REPO_URL,
                    "X-Title": "Zynex AI",
                },
            )
            content = response.choices[0].message.content or ""
            yield _sse({"choices": [{"delta": {"content": content}}]})
            yield "data: [DONE]\n\n"
            return

        response = await client.chat.completions.create(
            model=chosen_model,
            messages=messages,
            max_tokens=settings.MAX_TOKENS,
            stream=True,
            extra_headers={
                "HTTP-Referer": _REPO_URL,
                "X-Title": "Zynex AI",
            },
        )

        async for chunk in response:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield _sse({"choices": [{"delta": {"content": delta}}]})

        yield "data: [DONE]\n\n"

    except Exception as exc:  # provider/network errors after the SSE response started
        logger.exception("Chat completion failed for model %s: %s", chosen_model, exc)
        yield _sse(
            {
                "error": (
                    "The AI provider could not complete this request. "
                    "Check the server logs, your OpenRouter key, and the selected model."
                )
            }
        )
        yield "data: [DONE]\n\n"
