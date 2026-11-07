"""Export engine tests: PDF fallback, slides, and DOCX."""

from __future__ import annotations

from backend.agents.export_engine import (
    _generate_pdf_reportlab,
    generate_docx,
    generate_pdf,
    generate_slides,
)
from backend.models.schemas import (
    ChartData,
    Citation,
    ReportSection,
    ResearchReport,
)


def build_report() -> ResearchReport:
    return ResearchReport(
        topic="Sodium-ion batteries for grid storage",
        summary="Sodium-ion batteries are a promising alternative for stationary storage.",
        sections=[
            ReportSection(
                title="Introduction",
                content=(
                    "Sodium-ion cells avoid lithium and cobalt.\n\n"
                    "They are attractive for grid storage because sodium is abundant."
                ),
            ),
            ReportSection(
                title="Challenges",
                content="Energy density remains lower than lithium-ion chemistries.",
            ),
        ],
        citations=[
            Citation(
                index=1,
                title="Example source",
                url="https://example.com/sodium",
                snippet="A short snippet about sodium-ion batteries.",
            )
        ],
        charts=[
            ChartData(
                chart_type="bar",
                title="Illustrative metrics",
                labels=["Cost", "Abundance"],
                values=[70, 90],
            )
        ],
        generated_at="2026-11-07T12:00:00+00:00",
        word_count=42,
        demo_mode=True,
        model="google/gemma-4-31b-it:free",
    )


def test_reportlab_pdf_has_valid_header():
    pdf = _generate_pdf_reportlab(build_report(), {})
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


async def test_generate_pdf_falls_back_to_a_valid_pdf():
    pdf = await generate_pdf(build_report(), {})
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


async def test_generate_slides_is_standalone_html():
    html = await generate_slides(build_report(), {})
    assert html.lstrip().lower().startswith("<!doctype html")
    assert "Sodium-ion batteries for grid storage" in html
    assert "Introduction" in html


async def test_generate_docx_is_a_zip_container():
    docx = await generate_docx(build_report(), {})
    assert docx.startswith(b"PK")
    assert len(docx) > 1000
