from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pythonjsonlogger import jsonlogger

from backend.routes import health, research
from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.rate_limit import limiter, rate_limit_exceeded_handler

# Configure structured logging
def setup_logging():
    """Configure JSON structured logging."""
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s'
    )
    log_handler.setFormatter(formatter)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(log_handler)

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start cleanup task
    task = asyncio.create_task(research.cleanup_old_jobs())
    yield
    # Cancel cleanup task on shutdown
    task.cancel()

app = FastAPI(
    title="Zynex API",
    description="Autonomous AI Research Agent",
    version="2.0.0",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add request ID middleware
app.add_middleware(RequestIDMiddleware)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=False,  # Cannot use True with wildcard origin
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include API routers
app.include_router(health.router)
app.include_router(research.router)

# Mount static files for frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

@app.get("/")
async def root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
