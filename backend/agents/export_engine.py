"""
Zynex Export Engine
Generates PDF reports, HTML slide decks, and DOCX documents from ResearchReport + chart images.
"""

from __future__ import annotations

import base64
import logging
import re
from html import escape as xml_escape
from io import BytesIO

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from jinja2 import Environment, FileSystemLoader

from backend.config import settings
from backend.models.schemas import ResearchReport

logger = logging.getLogger("zynex.agents.export_engine")

# ── Jinja environment ─────────────────────────────────────────────────────────
_jinja_env = Environment(
    loader=FileSystemLoader(str(settings.TEMPLATES_DIR)),
    autoescape=True,
)


def _render_template(
    template_name: str,
    report: ResearchReport,
    charts: dict[str, str],
) -> str:
    """Render a Jinja2 template with the report data."""
    template = _jinja_env.get_template(template_name)
    return template.render(
        report=report,
        charts=charts,
        brand={
            "name": "Zynex",
            "primary_dark": "#0A0A0F",
            "primary_blue": "#3B82F6",
            "primary_cyan": "#06B6D4",
            "accent_violet": "#8B5CF6",
        },
    )


def _clean_text(value: str) -> str:
    """Normalise typography and strip characters ReportLab fonts cannot render."""
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
        "\u00a0": " ",
        "\u2022": "-",
    }
    text = value or ""
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return text


def _plain_paragraphs(content: str) -> list[str]:
    """Turn simple Markdown-ish report prose into plain paragraph strings."""
    text = _clean_text(content)
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"`([^`]+)`", r"\1", text)

    paragraphs = []
    for block in re.split(r"\n\s*\n", text):
        cleaned = " ".join(line.strip() for line in block.splitlines() if line.strip())
        if cleaned:
            paragraphs.append(cleaned)
    return paragraphs or ["No content was generated for this section."]


def _generate_pdf_reportlab(
    report: ResearchReport,
    charts: dict[str, str],
) -> bytes:
    """Render a clean PDF with ReportLab (works without native GTK libraries)."""
    from PIL import Image as PILImage
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.2 * cm,
        leftMargin=2.2 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.2 * cm,
        title=_clean_text(report.topic or "Zynex research report"),
        author="Zynex AI",
        subject="Autonomous AI research report",
    )

    base = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ZynexTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#0F172A"),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    subtitle_style = ParagraphStyle(
        "ZynexSubtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#4A90D9"),
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    meta_style = ParagraphStyle(
        "ZynexMeta",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_CENTER,
    )
    heading_style = ParagraphStyle(
        "ZynexHeading",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "ZynexBody",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=10.2,
        leading=15.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=8,
    )
    summary_style = ParagraphStyle(
        "ZynexSummary",
        parent=body_style,
        fontSize=10.5,
        leading=16,
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
        borderWidth=0.5,
        borderPadding=10,
        leftIndent=0,
        rightIndent=0,
        spaceAfter=14,
    )
    caption_style = ParagraphStyle(
        "ZynexCaption",
        parent=body_style,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_CENTER,
    )
    citation_style = ParagraphStyle(
        "ZynexCitation",
        parent=body_style,
        fontSize=9.2,
        leading=13,
        spaceAfter=2,
    )
    snippet_style = ParagraphStyle(
        "ZynexSnippet",
        parent=citation_style,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=10,
    )

    def footer(canvas, document):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#E2E8F0"))
        canvas.setLineWidth(0.5)
        canvas.line(2.2 * cm, 1.55 * cm, A4[0] - 2.2 * cm, 1.55 * cm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawString(2.2 * cm, 1.15 * cm, "Zynex AI Research")
        canvas.drawRightString(
            A4[0] - 2.2 * cm, 1.15 * cm, f"Page {document.page}"
        )
        canvas.restoreState()

    story = [
        Spacer(1, 5.6 * cm),
        Paragraph(xml_escape(_clean_text(report.topic or "Research report")), title_style),
        Paragraph("Autonomous AI Research Report", subtitle_style),
        Spacer(1, 0.4 * cm),
        Paragraph(
            xml_escape(
                f"Generated by Zynex AI \u00b7 {_clean_text(report.generated_at)[:10]}"
            ),
            meta_style,
        ),
    ]
    if report.demo_mode:
        story.append(
            Paragraph(
                "Demo narrative: text generated from built-in templates. "
                "Web search and cited sources are real.",
                meta_style,
            )
        )
    story.append(PageBreak())

    if report.summary:
        story.append(Paragraph("Executive Summary", heading_style))
        story.append(Paragraph(xml_escape(_clean_text(report.summary)), summary_style))

    for section in report.sections:
        story.append(Paragraph(xml_escape(_clean_text(section.title or "Section")), heading_style))
        for paragraph in _plain_paragraphs(section.content):
            story.append(Paragraph(xml_escape(paragraph), body_style))

    if charts:
        story.append(PageBreak())
        story.append(Paragraph("Data &amp; Charts", heading_style))
        for chart_title, encoded in charts.items():
            try:
                raw = base64.b64decode(encoded, validate=True)
                with PILImage.open(BytesIO(raw)) as image:
                    width, height = image.size
                max_width = 16.0 * cm
                max_height = 17.0 * cm
                scale = min(max_width / width, max_height / height, 1.0)
                story.append(
                    Image(BytesIO(raw), width=width * scale, height=height * scale)
                )
                story.append(
                    Paragraph(xml_escape(_clean_text(chart_title)), caption_style)
                )
                story.append(Spacer(1, 0.35 * cm))
            except Exception as exc:
                logger.warning("Skipping chart '%s' in PDF: %s", chart_title, exc)

    if report.citations:
        story.append(PageBreak())
        story.append(Paragraph("Sources", heading_style))
        for index, citation in enumerate(report.citations, 1):
            story.append(
                Paragraph(
                    f"<b>[{index}]</b> "
                    + xml_escape(_clean_text(citation.title or "Untitled source")),
                    citation_style,
                )
            )
            if citation.url:
                story.append(
                    Paragraph(xml_escape(citation.url), snippet_style)
                )
            if citation.snippet:
                story.append(
                    Paragraph(xml_escape(_clean_text(citation.snippet)), snippet_style)
                )

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    pdf_bytes = buffer.getvalue()
    logger.info("PDF generated with ReportLab (%d bytes)", len(pdf_bytes))
    return pdf_bytes


async def generate_pdf(
    report: ResearchReport,
    charts: dict[str, str],
) -> bytes:
    """
    Generate a professional PDF from the report.

    Tries WeasyPrint first (best typography when its native libraries are
    available) and falls back to ReportLab so PDF export also works on
    Windows and minimal containers.
    """
    logger.info("Generating PDF for '%s'", report.topic)

    html_content = _render_template("report.html", report, charts)

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_content).write_pdf()
        if pdf_bytes:
            logger.info("PDF generated with WeasyPrint (%d bytes)", len(pdf_bytes))
            return pdf_bytes
    except Exception as exc:
        logger.info("WeasyPrint unavailable (%s); using ReportLab fallback", exc)

    try:
        return _generate_pdf_reportlab(report, charts)
    except Exception as exc:
        logger.exception("ReportLab PDF generation failed")
        raise RuntimeError(
            "PDF generation failed. Check the server logs for details."
        ) from exc


async def generate_slides(
    report: ResearchReport,
    charts: dict[str, str],
) -> str:
    """
    Generate an HTML slide deck from the report.

    Returns complete HTML string with embedded CSS/JS for keyboard navigation.
    """
    logger.info("Generating slides for '%s'", report.topic)

    html_content = _render_template("slides.html", report, charts)
    logger.info("Slides generated successfully")
    return html_content


async def generate_docx(
    report: ResearchReport,
    charts: dict[str, str],
) -> bytes:
    """
    Generate a DOCX document from the report.

    Returns DOCX file as bytes.
    """
    logger.info("Generating DOCX for '%s'", report.topic)

    doc = Document()

    # Title
    title = doc.add_heading(report.topic, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Metadata
    doc.add_paragraph(f"Generated: {report.generated_at}")
    doc.add_paragraph(f"Word Count: {report.word_count}")
    doc.add_paragraph()

    # Summary
    if report.summary:
        doc.add_heading("Executive Summary", level=1)
        doc.add_paragraph(report.summary)
        doc.add_paragraph()

    # Sections
    for idx, section in enumerate(report.sections, 1):
        doc.add_heading(section.title or f"Section {idx}", level=1)
        doc.add_paragraph(section.content or "")
        doc.add_paragraph()

    # Citations
    if report.citations:
        doc.add_heading("Sources", level=1)
        for idx, citation in enumerate(report.citations, 1):
            p = doc.add_paragraph(f"[{idx}] ", style="List Number")
            p.add_run(citation.title or "Untitled").bold = True
            p.add_run(f"\n{citation.url or ''}")
            doc.add_paragraph()

    # Save to BytesIO
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    logger.info("DOCX generated successfully")
    return buffer.getvalue()
