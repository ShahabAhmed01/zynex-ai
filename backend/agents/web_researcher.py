"""
Zynex Web Researcher Agent
Executes planned search queries via DuckDuckGo, collects and deduplicates results.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.services import search_client

logger = logging.getLogger("zynex.agents.web_researcher")


async def research_web(
    queries: list[str],
    max_results_per_query: int = 5,
) -> list[dict[str, Any]]:
    """
    Execute all planned search queries and return deduplicated source list.

    Each source dict: {title, url, content, query}
    """
    logger.info("Starting web research with %d queries", len(queries))

    all_sources: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for idx, query in enumerate(queries, 1):
        logger.info("Query %d/%d: %s", idx, len(queries), query)
        try:
            results = await search_client.search(query, max_results=max_results_per_query)
        except Exception as exc:
            logger.error("Search failed for query '%s': %s", query, exc)
            results = []

        for r in results:
            url = r.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            all_sources.append(
                {
                    "title": r.get("title", "Untitled"),
                    "url": url,
                    "content": r.get("body", ""),
                    "query": query,
                }
            )

    logger.info("Web research complete: %d unique sources", len(all_sources))
    return all_sources
