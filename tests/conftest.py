"""Shared pytest fixtures.

The suite forces demo mode so tests are deterministic and never call a real
LLM provider. Research state is cleared between tests because the job store is
module-level and in-memory.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Must be set before backend.config is imported so .env cannot override it.
os.environ["OPENROUTER_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from backend.main import app  # noqa: E402
from backend.routes import research  # noqa: E402


@pytest.fixture()
def client():
    """TestClient with application lifespan enabled."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def reset_research_state():
    """Reset the in-memory research job store around every test."""
    research.jobs.clear()
    research.job_queues.clear()
    research.reports.clear()
    research.chart_data.clear()
    research.job_tokens.clear()
    yield
    research.jobs.clear()
    research.job_queues.clear()
    research.reports.clear()
    research.chart_data.clear()
    research.job_tokens.clear()
