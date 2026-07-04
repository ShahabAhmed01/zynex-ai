"""
Zynex Query Planner Agent
Takes a topic string and generates a structured research plan:
  - Search queries (5-7)
  - Report outline (sections)
  - Key research angles
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from backend.services import llm_client

logger = logging.getLogger("zynex.agents.query_planner")

_SYSTEM_PROMPT = (
    "You are a research planning assistant. Given a topic, produce a JSON object with:\n"
    '  "queries": a list of 5-7 search engine queries that will gather comprehensive info,\n'
    '  "outline": a list of section objects each with "title" and "description",\n'
    '  "key_angles": a list of 3-5 important angles to explore.\n'
    "Return ONLY valid JSON, no markdown fences, no extra text."
)

_DEPTH_QUERY_COUNT = {
    "quick": 4,
    "standard": 6,
    "deep": 8,
}

_DEPTH_SECTION_COUNT = {
    "quick": 3,
    "standard": 5,
    "deep": 7,
}


def _default_plan(topic: str, depth: str) -> dict[str, Any]:
    """Sensible default plan used in demo mode or on parse failure."""
    section_count = _DEPTH_SECTION_COUNT.get(depth, 5)
    all_sections = [
        {"title": "Introduction & Overview", "description": f"Define {topic} and its significance"},
        {"title": "Historical Context", "description": f"Evolution and background of {topic}"},
        {"title": "Current State of Affairs", "description": "Latest developments and trends"},
        {"title": "Key Statistics & Data", "description": "Important numbers and metrics"},
        {"title": "Expert Analysis & Opinions", "description": "What leading experts are saying"},
        {"title": "Challenges & Limitations", "description": "Current obstacles and criticisms"},
        {"title": "Future Outlook & Predictions", "description": "Where things are headed"},
    ]

    query_count = _DEPTH_QUERY_COUNT.get(depth, 6)
    all_queries = [
        f"{topic} overview definition",
        f"{topic} latest news {datetime.now().year}",
        f"{topic} statistics data research",
        f"{topic} expert analysis opinions",
        f"{topic} challenges problems limitations",
        f"{topic} future trends predictions",
        f"{topic} real world applications examples",
        f"{topic} comparison alternatives",
    ]

    return {
        "queries": all_queries[:query_count],
        "outline": all_sections[:section_count],
        "key_angles": [
            "Historical context and evolution",
            "Economic and industry impact",
            "Technological implications",
            "Social and ethical considerations",
            "Future trajectory",
        ],
    }


def _parse_plan(raw: str) -> dict[str, Any] | None:
    """Try to parse the LLM response as JSON. Return None on failure."""
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # remove first and last fence lines
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    # Remove demo-mode marker if present
    if "---" in cleaned:
        cleaned = cleaned[: cleaned.index("---")]

    try:
        data = json.loads(cleaned.strip())
        if "queries" in data and "outline" in data:
            return data
    except json.JSONDecodeError:
        pass

    return None


async def plan_research(topic: str, depth: str = "standard") -> dict[str, Any]:
    """
    Generate a research plan for the given topic.

    Returns a dict with keys: queries, outline, key_angles.
    """
    prompt = (
        f"Create a research plan for the topic: \"{topic}\"\n"
        f"Depth level: {depth}\n"
        f"Generate {_DEPTH_QUERY_COUNT.get(depth, 6)} search queries and "
        f"{_DEPTH_SECTION_COUNT.get(depth, 5)} report sections.\n"
        "Return ONLY valid JSON."
    )

    raw = await llm_client.generate_analytical(prompt=prompt, system=_SYSTEM_PROMPT)
    plan = _parse_plan(raw)

    if plan is None:
        logger.warning("Could not parse LLM plan, using default plan")
        plan = _default_plan(topic, depth)
    else:
        # Ensure counts match depth
        if len(plan.get("queries", [])) < 3:
            plan = _default_plan(topic, depth)

    logger.info(
        "Plan ready: %d queries, %d sections, %d angles",
        len(plan.get("queries", [])),
        len(plan.get("outline", [])),
        len(plan.get("key_angles", [])),
    )
    return plan
