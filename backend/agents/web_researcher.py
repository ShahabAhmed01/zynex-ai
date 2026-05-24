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

    results = await search_client.search_multiple(queries, max_results=max_results_per_query)

    all_sources: list[dict[str, Any]] = []
    for r in results:
        all_sources.append(
            {
                "title": r.get("title", "Untitled"),
                "url": r.get("url", ""),
                "content": r.get("body", ""),
                "query": "",  # search_multiple doesn't track which query produced each result
            }
        )

    logger.info("Web research complete: %d unique sources", len(all_sources))
    return all_sources
