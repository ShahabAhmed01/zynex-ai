"""Schema validation tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from backend.models.schemas import (
    ChartData,
    Citation,
    ProgressUpdate,
    ResearchReport,
    ResearchRequest,
)


@pytest.mark.parametrize("depth", ["quick", "standard", "deep"])
def test_research_request_accepts_supported_depths(depth):
    request = ResearchRequest(topic="Sodium-ion batteries", depth=depth)
    assert request.depth == depth


def test_research_request_defaults_to_standard():
    assert ResearchRequest(topic="Grid storage").depth == "standard"


@pytest.mark.parametrize(
    "payload",
    [
        {"topic": "x"},
        {"topic": ""},
        {"topic": "a" * 501},
        {"topic": "Valid topic", "depth": "unlimited"},
    ],
)
def test_research_request_rejects_invalid_payloads(payload):
    with pytest.raises(ValidationError):
        ResearchRequest(**payload)


def test_progress_update_bounds():
    update = ProgressUpdate(
        step=1,
        total_steps=6,
        stage="planning",
        message="Planning",
        progress=0.5,
    )
    assert update.progress == 0.5

    with pytest.raises(ValidationError):
        ProgressUpdate(
            step=1,
            total_steps=6,
            stage="planning",
            message="Bad progress",
            progress=1.5,
        )


def test_report_transparency_defaults():
    report = ResearchReport(
        topic="Topic",
        summary="Summary",
        sections=[],
        citations=[
            Citation(index=1, title="Source", url="https://example.com", snippet="Snippet")
        ],
        charts=[ChartData(chart_type="bar", title="Chart", labels=["A"], values=[1.0])],
        generated_at="2026-11-07T00:00:00+00:00",
    )
    assert report.demo_mode is False
    assert report.model == ""
    assert report.word_count == 0
