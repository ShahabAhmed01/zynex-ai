from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pythonjsonlogger import jsonlogger

from backend.routes import health, research

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
