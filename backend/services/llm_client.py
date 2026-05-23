"""
Zynex LLM Client
Communicates with OpenRouter (OpenAI-compatible) or falls back to demo templates.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from openai import AsyncOpenAI, APIError, APITimeoutError, RateLimitError

from backend.config import settings

logger = logging.getLogger("zynex.llm")

# ── Client singleton ─────────────────────────────────────────────────────────

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    """Lazy-initialise the OpenAI-compatible async client for OpenRouter."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY or "demo-placeholder",
            timeout=60.0,
        )
    return _client


# ── Demo responses ────────────────────────────────────────────────────────────

_DEMO_MARKER = (
    "\n\n---\n*🔬 Demo mode — configure OPENROUTER_API_KEY for real AI responses.*"
)


def _demo_response(prompt: str, system: str) -> str:
    """Return a plausible template response so the app works without an API key."""
    prompt_lower = prompt.lower()

    # Query-planner prompts
    if "search queries" in prompt_lower or "research plan" in prompt_lower:
        return (
            '{"queries": ['
            '"Overview and definition of the topic",'
            '"Latest research and developments",'
            '"Key statistics and data",'
            '"Expert opinions and analysis",'
            '"Challenges and future outlook",'
            '"Real-world applications and case studies",'
            '"Comparison with alternatives"'
            "],"
            '"outline": ['
            '{"title": "Introduction & Overview", "description": "Define the topic and its significance"},'
            '{"title": "Current State of Affairs", "description": "Latest developments and trends"},'
            '{"title": "Key Statistics & Data", "description": "Important numbers and metrics"},'
            '{"title": "Expert Analysis", "description": "What experts are saying"},'
            '{"title": "Challenges & Limitations", "description": "Current obstacles"},'
            '{"title": "Future Outlook", "description": "Where things are headed"}'
            "],"
            '"key_angles": ['
            '"Historical context",'
            '"Economic impact",'
            '"Technological implications",'
            '"Social considerations",'
            '"Environmental factors"'
            "]}" + _DEMO_MARKER
        )

    # Source-analysis prompts
    if "summarize" in prompt_lower or "analyze" in prompt_lower or "extract" in prompt_lower:
        return (
            '{"summary": "This source provides valuable information about the research topic, '
            'covering key aspects including recent developments, statistical data, and expert perspectives. '
            'The source highlights important trends and offers data-driven insights.",'
            '"key_facts": ['
            '"The topic has seen significant growth in recent years",'
            '"Multiple studies confirm the importance of this area",'
            '"Experts project continued development through the next decade",'
            '"Key metrics show positive trends across all measured dimensions"'
            "],"
            '"chart_data": {"chart_type": "bar", "title": "Key Metrics Overview", '
            '"labels": ["Growth", "Adoption", "Impact", "Innovation"], '
            '"values": [78, 65, 82, 71]}}'
            + _DEMO_MARKER
        )

    # Report-composition prompts
    if "compose" in prompt_lower or "report" in prompt_lower or "write" in prompt_lower:
        return (
            "This is a comprehensive analysis of the research topic. Based on multiple sources "
            "and expert analysis, several key findings have emerged.\n\n"
            "The research indicates significant developments in this area, with data showing "
            "consistent growth trends [1]. Multiple expert analyses confirm these findings, "
            "noting particularly strong momentum in recent quarters [2].\n\n"
            "Statistical data from various sources supports the conclusion that this topic "
            "represents an important area of development. Key metrics show improvement across "
            "all measured dimensions, with adoption rates increasing steadily [3].\n\n"
            "Looking ahead, experts project continued growth and evolution in this space. "
            "Several challenges remain, but the overall outlook is positive, with new "
            "innovations expected to address current limitations [4]."
            + _DEMO_MARKER
        )

    # Generic fallback
    return (
        "Based on the available research and data, this topic encompasses several important "
        "dimensions. Analysis of multiple sources reveals consistent patterns and significant "
        "findings that merit further exploration. The evidence suggests ongoing development "
        "and growing relevance across multiple domains."
        + _DEMO_MARKER
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def generate(
    prompt: str,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """
    Generate a completion from the LLM.

    Falls back to demo mode when no API key is configured.
    Includes retry logic (3 attempts with exponential backoff).
    """
    # ── Demo mode ─────────────────────────────────────────────────────────
    if settings.demo_mode:
        logger.info("Demo mode – returning template response")
        await asyncio.sleep(0.3)  # Simulate latency
        return _demo_response(prompt, system)

    # ── Real mode ─────────────────────────────────────────────────────────
    client = _get_client()
    chosen_model = model or settings.DEFAULT_MODEL

    messages: list[dict] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    last_error: Exception | None = None

    for attempt in range(1, 4):
        try:
            response = await client.chat.completions.create(
                model=chosen_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                extra_headers={
                    "HTTP-Referer": "https://zynex.ai",
                    "X-Title": "Zynex Research Agent",
                },
            )
            content = response.choices[0].message.content
            return content.strip() if content else ""

        except RateLimitError as exc:
            last_error = exc
            wait = 2 ** attempt
            logger.warning("Rate limited (attempt %d/3), waiting %ds…", attempt, wait)
            await asyncio.sleep(wait)

        except APITimeoutError as exc:
            last_error = exc
            wait = 2 ** attempt
            logger.warning("Timeout (attempt %d/3), waiting %ds…", attempt, wait)
            await asyncio.sleep(wait)

        except APIError as exc:
            last_error = exc
            logger.error("API error on attempt %d/3: %s", attempt, exc)
            if attempt < 3:
                await asyncio.sleep(2 ** attempt)

        except Exception as exc:
            last_error = exc
            logger.error("Unexpected error on attempt %d/3: %s", attempt, exc)
            if attempt < 3:
                await asyncio.sleep(1)

    # All retries exhausted – fall back to demo
    logger.error("All retries exhausted, falling back to demo: %s", last_error)
    return _demo_response(prompt, system)


async def generate_analytical(
    prompt: str,
    system: str = "",
    model: str | None = None,
    max_tokens: int = 4096,
) -> str:
    """Generate with lower temperature (0.3) for structured / analytical tasks."""
    return await generate(
        prompt=prompt,
        system=system,
        model=model,
        temperature=0.3,
        max_tokens=max_tokens,
    )


async def generate_creative(
    prompt: str,
    system: str = "",
    model: str | None = None,
    max_tokens: int = 4096,
) -> str:
    """Generate with higher temperature (0.7) for creative / narrative tasks."""
    return await generate(
        prompt=prompt,
        system=system,
        model=model,
        temperature=0.7,
        max_tokens=max_tokens,
    )


async def verify_connection() -> dict:
    """
    Ping OpenRouter with a minimal prompt to confirm the API key and model work.
    Does not use demo-mode fallbacks.
    """
    if settings.demo_mode:
        return {
            "ok": False,
            "demo_mode": True,
            "model": settings.DEFAULT_MODEL,
            "message": "OPENROUTER_API_KEY not set — running in demo mode",
        }

    client = _get_client()
    chosen_model = settings.DEFAULT_MODEL

    try:
        response = await client.chat.completions.create(
            model=chosen_model,
            messages=[
                {
                    "role": "user",
                    "content": 'Reply with exactly one word: OK',
                }
            ],
            temperature=0,
            max_tokens=16,
            extra_headers={
                "HTTP-Referer": "https://github.com/ShahabAhmed01/zynex-ai",
                "X-Title": "Zynex Research Agent",
            },
        )
        content = (response.choices[0].message.content or "").strip()
        ok = bool(content)
        return {
            "ok": ok,
            "demo_mode": False,
            "model": chosen_model,
            "message": "OpenRouter connection successful" if ok else "Empty response from model",
            "sample": content[:80],
        }
    except Exception as exc:
        logger.error("OpenRouter verification failed: %s", exc)
        return {
            "ok": False,
            "demo_mode": False,
            "model": chosen_model,
            "message": str(exc),
        }
