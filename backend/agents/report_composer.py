"""
Zynex Report Composer Agent
Takes analyzed sources + outline and composes a full ResearchReport
with inline citations [1], [2], etc.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.models.schemas import (
    ChartData,
    Citation,
    ReportSection,
    ResearchReport,
)
from backend.services import llm_client

logger = logging.getLogger("zynex.agents.report_composer")

_SYSTEM_PROMPT = (
    "You are an expert research report writer. Write a detailed, well-structured "
    "section of a research report. Use inline citations like [1], [2], etc. to "
    "reference sources. Write in a professional, analytical tone. "
    "Be thorough but concise. Use paragraphs, not bullet points."
)


def _build_citations(sources: list[dict[str, Any]]) -> list[Citation]:
    """Build citation list from sources."""
    citations: list[Citation] = []
    for idx, source in enumerate(sources, 1):
        citations.append(
            Citation(
                index=idx,
                title=source.get("title", f"Source {idx}"),
                url=source.get("url", ""),
                snippet=source.get("summary", source.get("content", ""))[:200],
            )
        )
    return citations


def _build_source_context(sources: list[dict[str, Any]]) -> str:
    """Build a context string listing all sources for the LLM."""
    parts: list[str] = []
    for idx, source in enumerate(sources, 1):
        title = source.get("title", f"Source {idx}")
        summary = source.get("summary", source.get("content", ""))[:300]
        key_facts = source.get("key_facts", [])
        facts_str = "; ".join(key_facts) if key_facts else "No specific facts extracted."
        parts.append(
            f"[{idx}] {title}\n"
            f"    Summary: {summary}\n"
            f"    Key Facts: {facts_str}"
        )
    return "\n\n".join(parts)


def _extract_charts(sources: list[dict[str, Any]], topic: str) -> list[ChartData]:
    """Extract chart data from analyzed sources, generate defaults if none found."""
    charts: list[ChartData] = []

    for source in sources:
        cd = source.get("chart_data")
        if cd and isinstance(cd, dict):
            try:
                chart = ChartData(
                    chart_type=cd.get("chart_type", "bar"),
                    title=cd.get("title", "Data Overview"),
                    labels=cd.get("labels", []),
                    values=[float(v) for v in cd.get("values", [])],
                    colors=cd.get("colors"),
                )
                if chart.labels and chart.values:
                    charts.append(chart)
            except (ValueError, TypeError) as exc:
                logger.warning("Skipping invalid chart data: %s", exc)

    # Always generate at least a source-relevance chart
    if not charts:
        relevance_scores = []
        labels = []
        for idx, source in enumerate(sources[:8], 1):
            title = source.get("title", f"Source {idx}")
            # Truncate title for chart label
            label = title[:25] + "…" if len(title) > 25 else title
            labels.append(label)
            # Heuristic relevance: based on content length + facts count
            content_len = len(source.get("content", ""))
            facts_count = len(source.get("key_facts", []))
            score = min(100, (content_len / 10) + (facts_count * 15) + 30)
            relevance_scores.append(round(score, 1))

        if labels:
            charts.append(
                ChartData(
                    chart_type="bar",
                    title=f"Source Relevance Analysis: {topic}",
                    labels=labels,
                    values=relevance_scores,
                    colors=["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981",
                            "#F59E0B", "#EF4444", "#EC4899", "#6366F1"],
                )
            )

    # Add a topic coverage chart
    coverage_areas = ["Background", "Data & Stats", "Expert Views", "Challenges", "Future"]
    coverage_values = [
        min(100, len(sources) * 12 + 20),
        min(100, sum(1 for s in sources if s.get("chart_data")) * 25 + 15),
        min(100, len(sources) * 10 + 25),
        min(100, len(sources) * 8 + 20),
        min(100, len(sources) * 7 + 15),
    ]
    charts.append(
        ChartData(
            chart_type="pie",
            title=f"Research Coverage: {topic}",
            labels=coverage_areas,
            values=coverage_values,
            colors=["#3B82F6", "#06B6D4", "#8B5CF6", "#10B981", "#F59E0B"],
        )
    )

    return charts


async def compose_report(
    topic: str,
    outline: list[dict[str, Any]],
    analyzed_sources: list[dict[str, Any]],
) -> ResearchReport:
    """
    Compose the full research report from analyzed sources and outline.
    """
    logger.info("Composing report for '%s' with %d sections", topic, len(outline))

    source_context = _build_source_context(analyzed_sources)
    citations = _build_citations(analyzed_sources)
    charts = _extract_charts(analyzed_sources, topic)

    # ── Executive summary ─────────────────────────────────────────────────
    summary_prompt = (
        f"Write a 3-4 sentence executive summary for a research report about: {topic}\n\n"
        f"Available sources:\n{source_context}\n\n"
        "Use inline citations [1], [2], etc. Be concise and impactful."
    )

    # ── Compose each section ──────────────────────────────────────────────
    section_tasks = []
    for sec_def in outline:
        title = sec_def.get("title", "Section")
        description = sec_def.get("description", "")

        section_prompt = (
            f"Write the '{title}' section of a research report about: {topic}\n"
            f"Section focus: {description}\n\n"
            f"Available sources:\n{source_context}\n\n"
            "Write 2-4 substantive paragraphs with inline citations [1], [2], etc. "
            "Be analytical and data-driven where possible."
        )
        section_tasks.append(
            llm_client.generate_creative(prompt=section_prompt, system=_SYSTEM_PROMPT)
        )

    # Parallelize summary and section generation
    results = await asyncio.gather(
        llm_client.generate_creative(prompt=summary_prompt, system=_SYSTEM_PROMPT),
        *section_tasks
    )
    summary = results[0]
    section_contents = results[1:]

    sections: list[ReportSection] = []
    for idx, sec_def in enumerate(outline):
        title = sec_def.get("title", "Section")
        content = section_contents[idx]

        # Attach relevant charts to sections
        section_charts: list[ChartData] = []
        if "data" in title.lower() or "statistic" in title.lower():
            # Attach data-related charts to data sections
            for c in charts:
                if c.chart_type == "bar":
                    section_charts.append(c)
                    break

        sections.append(
            ReportSection(
                title=title,
                content=content,
                charts=section_charts,
            )
        )

    # Calculate word count
    total_words = len(summary.split())
    for section in sections:
        total_words += len(section.content.split())

    report = ResearchReport(
        topic=topic,
        summary=summary,
        sections=sections,
        citations=citations,
        charts=charts,
        generated_at=datetime.now(timezone.utc).isoformat(),
        word_count=total_words,
    )

    logger.info(
        "Report composed: %d sections, %d citations, %d charts",
        len(sections),
        len(citations),
        len(charts),
    )
    return report
