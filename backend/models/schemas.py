"""
Zynex Pydantic Schemas
Defines every data structure exchanged between services, agents, and API routes.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request / Response ───────────────────────────────────────────────────────

class ResearchRequest(BaseModel):
    """Incoming research request from the frontend."""
    topic: str = Field(..., min_length=3, max_length=500, description="Research topic")
    depth: str = Field(
        default="standard",
        pattern="^(quick|standard|deep)$",
        description="Research depth: quick, standard, or deep",
    )


# ── Report Building Blocks ───────────────────────────────────────────────────

class Citation(BaseModel):
    """A single bibliographic citation."""
    index: int
    title: str
    url: str
    snippet: str


class ChartData(BaseModel):
    """Describes one chart to be rendered."""
    chart_type: str = Field(..., description="bar, pie, or line")
    title: str
    labels: list[str]
    values: list[float]
    colors: list[str] | None = None


class ReportSection(BaseModel):
    """One section of the generated report."""
    title: str
    content: str
    charts: list[ChartData] = []


class ResearchReport(BaseModel):
    """The complete research report produced by the pipeline."""
    topic: str
    summary: str
    sections: list[ReportSection]
    citations: list[Citation]
    charts: list[ChartData]
    generated_at: str


# ── Progress / Job Tracking ──────────────────────────────────────────────────

class ProgressUpdate(BaseModel):
    """A single progress event pushed over SSE."""
    step: int
    total_steps: int
    stage: str
    message: str
    progress: float = Field(..., ge=0.0, le=1.0)


class JobStatus(BaseModel):
    """Full status snapshot for a research job."""
    job_id: str
    status: str = Field(
        ..., pattern="^(pending|running|completed|failed)$"
    )
    progress: ProgressUpdate | None = None
    report: ResearchReport | None = None
    error: str | None = None
