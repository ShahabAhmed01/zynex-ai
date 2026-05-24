import asyncio
import logging
import os
import tempfile
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.models.schemas import ResearchRequest, JobStatus, ProgressUpdate
from backend.agents.query_planner import plan_research
from backend.agents.web_researcher import research_web
from backend.agents.source_analyzer import analyze_sources
from backend.agents.report_composer import compose_report
from backend.agents.chart_generator import generate_charts
from backend.agents.export_engine import generate_pdf, generate_slides, generate_docx
from backend.utils.sanitize import sanitize_topic, sanitize_depth

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# In-memory job storage
jobs: dict[str, JobStatus] = {}
job_queues: dict[str, asyncio.Queue] = {}
reports: dict[str, dict] = {}
chart_data: dict[str, dict] = {}
job_tokens: dict[str, str] = {}

# Job TTL configuration
JOB_TTL_HOURS = 2

logger = logging.getLogger(__name__)

async def cleanup_old_jobs():
    """Background task to clean up expired jobs every 30 minutes."""
    while True:
        await asyncio.sleep(1800)  # 30 minutes
        now = datetime.now(timezone.utc)
        expired = []
        for job_id, job in list(jobs.items()):
            if hasattr(job, 'created_at') and job.created_at:
                try:
                    created_dt = datetime.fromisoformat(job.created_at)
                    age = now - created_dt
                    if age > timedelta(hours=JOB_TTL_HOURS):
                        expired.append(job_id)
                except (ValueError, TypeError):
                    # If created_at is invalid, consider it expired
                    expired.append(job_id)

        for job_id in expired:
            jobs.pop(job_id, None)
            job_queues.pop(job_id, None)
            reports.pop(job_id, None)
            chart_data.pop(job_id, None)
            job_tokens.pop(job_id, None)

        if expired:
            logger.info("Cleaned up %d expired jobs", len(expired))

async def run_pipeline(job_id: str, topic: str, depth: str):
    queue = job_queues[job_id]
    
    try:
        # Stage 1: Planning
        await queue.put(ProgressUpdate(step=1, total_steps=6, stage="planning", message="Generating research queries and outline...", progress=0.1))
        plan = await plan_research(topic, depth)
        
        # Stage 2: Web Research
        await queue.put(ProgressUpdate(step=2, total_steps=6, stage="researching", message="Searching the web for sources...", progress=0.3))
        raw_sources = await research_web(plan["queries"])
        
        # Stage 3: Source Analysis
        await queue.put(ProgressUpdate(step=3, total_steps=6, stage="analyzing", message="Analyzing and summarizing sources...", progress=0.5))
        if not raw_sources:
            raw_sources = [
                {
                    "title": f"Overview of {topic}",
                    "url": "https://example.com/zynex-fallback",
                    "content": (
                        f"Research context for {topic}. "
                        "Web search returned no results; using demo synthesis."
                    ),
                    "query": topic,
                }
            ]

        analyzed_sources = await analyze_sources(raw_sources)

        # Stage 4: Report Composition
        await queue.put(ProgressUpdate(step=4, total_steps=6, stage="composing", message="Composing structured report...", progress=0.7))
        report = await compose_report(topic, plan["outline"], analyzed_sources)
        
        # Stage 5: Chart Generation
        await queue.put(ProgressUpdate(step=5, total_steps=6, stage="charting", message="Generating charts and visualizations...", progress=0.85))
        charts = await generate_charts(report.charts)
        
        # Store results
        reports[job_id] = report
        chart_data[job_id] = charts
        
        # Stage 6: Completed
        jobs[job_id].status = "completed"
        jobs[job_id].report = report
        await queue.put(ProgressUpdate(step=6, total_steps=6, stage="completed", message="Research complete!", progress=1.0))
        
    except Exception as e:
        jobs[job_id].status = "failed"
        jobs[job_id].error = str(e)
        await queue.put(ProgressUpdate(step=6, total_steps=6, stage="failed", message=f"Error: {str(e)}", progress=1.0))

@router.post("/api/research")
@limiter.limit("5/minute")
async def start_research(request: Request, research_request: ResearchRequest, background_tasks: BackgroundTasks):
    # Sanitize inputs to prevent prompt injection
    topic = sanitize_topic(research_request.topic)
    depth = sanitize_depth(research_request.depth)
    
    job_id = str(uuid4())
    access_token = str(uuid4())
    jobs[job_id] = JobStatus(
        job_id=job_id,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat()
    )
    job_queues[job_id] = asyncio.Queue()
    job_tokens[job_id] = access_token

    background_tasks.add_task(run_pipeline, job_id, research_request.topic, research_request.depth)
    return {"job_id": job_id, "access_token": access_token}

@router.get("/api/research/{job_id}/status")
async def stream_status(job_id: str, token: str = None):
    if job_id not in job_queues:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")

    async def event_stream():
        queue = job_queues[job_id]
        try:
            while True:
                update = await queue.get()
                yield f"data: {update.model_dump_json()}\n\n"
                if update.stage in ("completed", "failed"):
                    break
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for job {job_id}")
            raise

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("/api/research/{job_id}/poll")
async def poll_job_status(job_id: str, token: str = None):
    """JSON endpoint for polling job status (fallback when SSE fails)."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")
    
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job.status,
        "error": job.error,
    }

@router.get("/api/research/{job_id}/report")
async def get_report(job_id: str, token: str = None):
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found or not completed")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")
    
    report_dict = reports[job_id].model_dump()
    report_dict["charts_base64"] = chart_data.get(job_id, {})
    return report_dict

@router.get("/api/research/{job_id}/export/pdf")
async def get_export_pdf(job_id: str, background_tasks: BackgroundTasks, token: str = None):
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")

    pdf_bytes = await generate_pdf(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, 'wb') as f:
        f.write(pdf_bytes)

    # Schedule cleanup AFTER the file is served
    background_tasks.add_task(os.unlink, path)

    return FileResponse(path, media_type="application/pdf", filename=f"Zynex_Report_{job_id[:8]}.pdf")

@router.get("/api/research/{job_id}/export/slides")
async def get_export_slides(job_id: str, background_tasks: BackgroundTasks, token: str = None):
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")

    html_content = await generate_slides(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".html")
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Schedule cleanup AFTER the file is served
    background_tasks.add_task(os.unlink, path)

    return FileResponse(path, media_type="text/html", filename=f"Zynex_Slides_{job_id[:8]}.html")

@router.get("/api/research/{job_id}/export/docx")
async def get_export_docx(job_id: str, background_tasks: BackgroundTasks, token: str = None):
    if job_id not in reports:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Validate access token
    if token != job_tokens.get(job_id):
        raise HTTPException(status_code=403, detail="Invalid access token")

    docx_bytes = await generate_docx(reports[job_id], chart_data.get(job_id, {}))

    fd, path = tempfile.mkstemp(suffix=".docx")
    with os.fdopen(fd, 'wb') as f:
        f.write(docx_bytes)

    # Schedule cleanup AFTER the file is served
    background_tasks.add_task(os.unlink, path)

    return FileResponse(path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename=f"Zynex_Report_{job_id[:8]}.docx")
