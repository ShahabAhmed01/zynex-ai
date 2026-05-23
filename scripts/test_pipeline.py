#!/usr/bin/env python3
"""Quick integration test for the Zynex research pipeline (demo mode)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from backend.agents.query_planner import plan_research
from backend.agents.web_researcher import research_web
from backend.agents.source_analyzer import analyze_sources
from backend.agents.report_composer import compose_report
from backend.agents.chart_generator import generate_charts


async def main() -> int:
    topic = "Renewable energy trends"
    depth = "quick"

    plan = await plan_research(topic, depth)
    assert "queries" in plan and "outline" in plan, "plan missing keys"

    sources = await research_web(plan["queries"][:2], max_results_per_query=2)
    if not sources:
        print("WARN: no web sources (DDG may be rate-limited); using synthetic source")
        sources = [
            {
                "title": "Test Source",
                "url": "https://example.com",
                "content": "Renewable energy is growing rapidly worldwide.",
                "query": topic,
            }
        ]

    analyzed = await analyze_sources(sources[:3])
    report = await compose_report(topic, plan["outline"], analyzed)
    charts = await generate_charts(report.charts)

    assert report.topic == topic
    assert len(report.sections) > 0
    assert len(report.citations) > 0
    print(f"OK: {len(report.sections)} sections, {len(report.citations)} citations, {len(charts)} charts")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
