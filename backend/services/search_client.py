"""
Zynex Search Client
Wraps DuckDuckGo Search for free, no-API-key web searching.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from duckduckgo_search import DDGS

logger = logging.getLogger("zynex.search")

# Rate-limit guard – minimum seconds between requests
_MIN_INTERVAL = 1.5
_last_request_time: float = 0.0
_lock = asyncio.Lock()


async def _rate_limit() -> None:
    """Ensure we don't hammer DuckDuckGo too quickly."""
    global _last_request_time
    import time

    async with _lock:
        now = time.monotonic()
        elapsed = now - _last_request_time
        if elapsed < _MIN_INTERVAL:
            wait = _MIN_INTERVAL - elapsed
            logger.debug("Rate-limit: sleeping %.2fs", wait)
            await asyncio.sleep(wait)
        _last_request_time = time.monotonic()


def _do_search(query: str, max_results: int) -> list[dict[str, Any]]:
    """Synchronous DuckDuckGo search (runs in thread pool)."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("href", r.get("link", "")),
                "body": r.get("body", r.get("snippet", "")),
            }
            for r in results
        ]
    except Exception as exc:
        logger.error("DuckDuckGo search failed for '%s': %s", query, exc)
        return []


async def search(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    """
    Search DuckDuckGo and return a list of results.

    Each result dict has keys: title, url, body.
    """
    await _rate_limit()
    logger.info("Searching: %s (max %d)", query, max_results)
    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(None, _do_search, query, max_results)
    logger.info("Got %d results for '%s'", len(results), query)
    return results


async def search_multiple(
    queries: list[str], max_results: int = 5
) -> list[dict[str, Any]]:
    """
    Run multiple searches sequentially and return deduplicated results.

    Deduplication is by URL.
    """
    seen_urls: set[str] = set()
    all_results: list[dict[str, Any]] = []

    for query in queries:
        results = await search(query, max_results=max_results)
        for r in results:
            url = r.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_results.append(r)

    logger.info(
        "Multi-search: %d queries → %d unique results",
        len(queries),
        len(all_results),
    )
    return all_results
