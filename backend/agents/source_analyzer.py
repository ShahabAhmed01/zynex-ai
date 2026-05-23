"""
Zynex Source Analyzer Agent
Takes raw sources, uses LLM to summarize each, extract key facts,
and identify chartable data points.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.services import llm_client

logger = logging.getLogger("zynex.agents.source_analyzer")

_SYSTEM_PROMPT = (
    "You are a research analyst. Given a source text, return a JSON object with:\n"
    '  "summary": a 2-3 sentence summary,\n'
    '  "key_facts": a list of 3-5 key factual takeaways,\n'
    '  "chart_data": (optional) if numeric/chartable data exists, an object with '
    '"chart_type" (bar|pie|line), "title", "labels" (list of strings), "values" (list of numbers). '
    "If no chartable data, set chart_data to null.\n"
    "Return ONLY valid JSON, no markdown fences."
)


def _parse_analysis(raw: str) -> dict[str, Any] | None:
    """Try to parse LLM output as JSON analysis."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    if "---" in cleaned:
        cleaned = cleaned[: cleaned.index("---")]

    try:
        data = json.loads(cleaned.strip())
        if "summary" in data:
            return data
    except json.JSONDecodeError:
        pass
    return None


def _default_analysis(source: dict[str, Any]) -> dict[str, Any]:
    """Fallback analysis when LLM parse fails."""
    title = source.get("title", "Source")
    content = source.get("content", "")
    snippet = content[:200] if content else "No content available."
    return {
        "summary": f"This source titled '{title}' provides relevant information about the research topic. {snippet}",
        "key_facts": [
            f"Source covers aspects related to the topic from '{title}'",
            "Contains relevant data points and contextual information",
            "Provides supporting evidence for the research",
        ],
        "chart_data": None,
    }


async def analyze_sources(
    sources: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Analyze each source: summarize, extract facts, find chartable data.

    Returns enriched source dicts with added keys: summary, key_facts, chart_data.
    """
    logger.info("Analyzing %d sources", len(sources))
    analyzed: list[dict[str, Any]] = []

    # Process sources in batches to avoid overwhelming the LLM
    batch_size = 5
    for i in range(0, len(sources), batch_size):
        batch = sources[i: i + batch_size]

        for source in batch:
            title = source.get("title", "Untitled")
            content = source.get("content", "")

            prompt = (
                f"Analyze this source:\n"
                f"Title: {title}\n"
                f"Content: {content[:1500]}\n\n"
                "Extract a summary, key facts, and any chartable data. Return ONLY valid JSON."
            )

            try:
                raw = await llm_client.generate_analytical(prompt=prompt, system=_SYSTEM_PROMPT)
                analysis = _parse_analysis(raw)
                if analysis is None:
                    analysis = _default_analysis(source)
            except Exception as exc:
                logger.error("Analysis failed for '%s': %s", title, exc)
                analysis = _default_analysis(source)

            enriched = {
                **source,
                "summary": analysis.get("summary", ""),
                "key_facts": analysis.get("key_facts", []),
                "chart_data": analysis.get("chart_data"),
            }
            analyzed.append(enriched)

    logger.info("Source analysis complete: %d sources analyzed", len(analyzed))
    return analyzed
