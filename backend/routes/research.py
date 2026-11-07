"""Research API routes and the in-memory job manager."""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
import tempfile
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

from backend.agents.chart_generator import generate_charts
from backend.agents.export_engine import generate_docx, generate_pdf, generate_slides
from backend.agents.query_planner import plan_research
from backend.agents.report_composer import compose_report
from backend.agents.source_analyzer import analyze_sources
from backend.agents.web_researcher import research_web
from backend.middleware.rate_limit import limiter
from backend.models.schemas import (
    JobStatus,
    ProgressUpdate,
    ResearchReport,
    ResearchRequest,
)
from backend.utils.sanitize import sanitize_depth, sanitize_topic

router = APIRouter()
logger = logging.getLogger("zynex.research")

# In-memory job storage. Jobs expire after JOB_TTL_HOURS and are not shared
# between processes; run a single uvicorn worker unless you add a real queue.
jobs: dict[str, JobStatus] = {}
job_queues: dict[str, asyncio.Queue[ProgressUpdate]] = {}
reports: dict[str, ResearchReport] = {}
chart_data: dict[str, dict[str, str]] = {}
job_tokens: dict[str, str] = {}

JOB_TTL_HOURS = 2
_TOTAL_STEPS = 6


def _authorize(job_id: str, token: str | None) -> None:
    """Validate a job access token in constant time."""
    expected = job_tokens.get(job_id)
    if expected is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if not token or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=403, detail="Invalid or missing access token")


async def _publish(
    job_id: str,
    *,
    step: int,
    stage: str,
    message: str,
    progress: float,
    status: str = "running",
) -> None:
    """Update the job snapshot and push a progress event to its SSE queue."""
    update = ProgressUpdate(
        step=step,
        total_steps=_TOTAL_STEPS,
        stage=stage,
        message=message,
        progress=progress,
    )
    job = jobs.get(job_id)
    if job is not None:
        job.status = status
        job.progress = update

    queue = job_queues.get(job_id)
    if queue is not None:
        await queue.put(update)


async def cleanup_old_jobs() -> None:
    """Background task that removes expired jobs every 30 minutes."""
    while True:
        await asyncio.sleep(1800)
        now = datetime.now(timezone.utc)
        expired: list[str] = []

        for job_id, job in list(jobs.items()):
            if not job.created_at:
                continue
            try:
                created_dt = datetime.fromisoformat(job.created_at)
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                if now - created_dt > timedelta(hours=JOB_TTL_HOURS):
                    expired.append(job_id)
            except (ValueError, TypeError):
                expired.append(job_id)

        for job_id in expired:
            jobs.pop(job_id, None)
            job_queues.pop(job_id, None)
            reports.pop(job_id, None)
            chart_data.pop(job_id, None)
            job_tokens.pop(job_id, None)

        if expired:
            logger.info("Cleaned up %d expired jobs", len(expired))


async def run_pipeline(job_id: str, topic: str, depth: str) -> None:
    """Run the six-stage research pipeline for one job."""
    try:
        await _publish(
            job_id,
            step=1,
            stage="planning",
            message="Generating research queries and outline…",
            progress=0.1,
        )
        plan = await plan_research(topic, depth)

        await _publish(
            job_id,
            step=2,
            stage="researching",
            message="Searching the web for sources…",
            progress=0.3,
        )
        raw_sources = await research_web(plan["queries"])
        if not raw_sources:
            raise RuntimeError(
                "Web search returned no sources. DuckDuckGo may be rate-limiting "
                "requests — wait a minute and try again."
            )

        await _publish(
            job_id,
            step=3,
            stage="analyzing",
            message=f"Analyzing {len(raw_sources)} sources…",
            progress=0.5,
        )
        analyzed_sources = await analyze_sources(raw_sources)

        await _publish(
            job_id,
            step=4,
            stage="composing",
            message="Composing the cited report…",
            progress=0.7,
        )
        report = await compose_report(topic, plan["outline"], analyzed_sources)

        await _publish(
            job_id,
            step=5,
            stage="charting",
            message="Rendering charts…",
            progress=0.85,
        )
        charts = await generate_charts(report.charts)

        reports[job_id] = report
        chart_data[job_id] = charts

        await _publish(
            job_id,
            step=6,
            stage="completed",
            message="Research complete.",
            progress=1.0,
            status="completed",
        )

    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Research job %s failed: %s", job_id, exc)
        job = jobs.get(job_id)
        if job is not None:
            job.status = "failed"
            job.error = str(exc)
        await _publish(
            job_id,
            step=_TOTAL_STEPS,
            stage="failed",
            message=f"Research failed: {exc}",
            progress=1.0,
            status="failed",
        )


@router.post("/research")
@limiter.limit("5/minute")
async def start_research(
    request: Request,
    research_request: ResearchRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """Create a research job and start the pipeline in the background."""
    topic = sanitize_topic(research_request.topic)
    depth = sanitize_depth(research_request.depth)
    if len(topic) < 3:
        raise HTTPException(
            status_code=422,
            detail="Please enter a more descriptive research topic.",
        )

    job_id = str(uuid4())
    access_token = str(uuid4())
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    job_queues[job_id] = asyncio.Queue()
    job_tokens[job_id] = access_token

    background_tasks.add_task(run_pipeline, job_id, topic, depth)
    return {
        "job_id": job_id,
        "access_token": access_token,
        "topic": topic,
        "depth": depth,
    }


@router.get("/research/{job_id}/status")
async def stream_status(job_id: str, token: str | None = None) -> StreamingResponse:
    """Stream job progress over Server-Sent Events."""
    _authorize(job_id, token)
    queue = job_queues.get(job_id)
    if queue is None:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_stream():
        job = jobs.get(job_id)
        if job is not None and job.progress is not None:
            yield f"data: {job.progress.model_dump_json()}\n\n"
            if job.status in ("completed", "failed"):
                return

        while True:
            try:
                update = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                # Keep proxies and browsers from closing an idle SSE stream.
                yield ": keep-alive\n\n"
                continue

            yield f"data: {update.model_dump_json()}\n\n"
            if update.stage in ("completed", "failed"):
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/research/{job_id}/poll")
async def poll_job_status(job_id: str, token: str | None = None) -> dict:
    """JSON status endpoint used as a fallback when SSE is unavailable."""
    _authorize(job_id, token)
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job.status,
        "error": job.error,
        "progress": job.progress.model_dump() if job.progress else None,
        "report_ready": job_id in reports,
    }


@router.get("/research/{job_id}/report")
async def get_report(job_id: str, token: str | None = None) -> dict:
    """Return the completed report and its rendered charts."""
    _authorize(job_id, token)
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found or not completed")

    report_dict = reports[job_id].model_dump()
    report_dict["charts_base64"] = chart_data.get(job_id, {})
    return report_dict


@router.get("/research/{job_id}/export/pdf")
async def get_export_pdf(
    job_id: str,
    background_tasks: BackgroundTasks,
    token: str | None = None,
) -> FileResponse:
    """Export the report as a PDF."""
    _authorize(job_id, token)
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = await generate_pdf(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, "wb") as file:
        file.write(pdf_bytes)
    background_tasks.add_task(os.unlink, path)

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"Zynex_Report_{job_id[:8]}.pdf",
    )


@router.get("/research/{job_id}/export/slides")
async def get_export_slides(
    job_id: str,
    background_tasks: BackgroundTasks,
    token: str | None = None,
) -> FileResponse:
    """Export the report as a standalone HTML slide deck."""
    _authorize(job_id, token)
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")

    html_content = await generate_slides(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".html")
    with os.fdopen(fd, "w", encoding="utf-8") as file:
        file.write(html_content)
    background_tasks.add_task(os.unlink, path)

    return FileResponse(
        path,
        media_type="text/html",
        filename=f"Zynex_Slides_{job_id[:8]}.html",
    )


@router.get("/research/{job_id}/export/docx")
async def get_export_docx(
    job_id: str,
    background_tasks: BackgroundTasks,
    token: str | None = None,
) -> FileResponse:
    """Export the report as a DOCX document."""
    _authorize(job_id, token)
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")

    docx_bytes = await generate_docx(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".docx")
    with os.fdopen(fd, "wb") as file:
        file.write(docx_bytes)
    background_tasks.add_task(os.unlink, path)

    return FileResponse(
        path,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document"
        ),
        filename=f"Zynex_Report_{job_id[:8]}.docx",
    )
