#!/usr/bin/env python3
"""HTTP end-to-end test against a running Zynex server.

Covers the research pipeline, token-protected status/report routes, and all
three export formats. Run with a server already listening:

    python scripts/test_api_e2e.py http://127.0.0.1:8000
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"
TIMEOUT = 180


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as resp:
        return json.loads(resp.read().decode())


def get_bytes(path: str) -> tuple[bytes, str]:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=60) as resp:
        return resp.read(), resp.headers.get("Content-Type", "")


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def token_path(path: str, token: str) -> str:
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}token={urllib.parse.quote(token)}"


def main() -> int:
    health = get("/api/health")
    assert health.get("status") == "healthy", health
    print(f"health OK (version {health.get('version')}, demo={health.get('demo_mode')})")

    job = post("/api/research", {"topic": "AI in healthcare", "depth": "quick"})
    job_id = job["job_id"]
    token = job["access_token"]
    print(f"job {job_id}")

    report = None
    deadline = time.time() + TIMEOUT
    last_stage = None
    while time.time() < deadline:
        req = urllib.request.Request(f"{BASE}{token_path(f'/api/research/{job_id}/status', token)}")
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            for raw in resp:
                line = raw.decode().strip()
                if not line.startswith("data:"):
                    continue
                update = json.loads(line[5:].strip())
                stage = update.get("stage")
                if stage != last_stage:
                    print(f"  stage={stage} progress={update.get('progress')}")
                    last_stage = stage
                if stage == "completed":
                    report = get(token_path(f"/api/research/{job_id}/report", token))
                    break
                if stage == "failed":
                    print("FAIL:", update.get("message"))
                    return 1
        if report is not None:
            break
        time.sleep(0.5)

    if report is None:
        print("TIMEOUT waiting for pipeline")
        return 1

    assert report.get("topic"), "missing topic"
    assert report.get("sections"), "missing sections"
    assert report.get("citations"), "missing citations"
    print(
        f"report OK: {len(report['sections'])} sections, "
        f"{len(report['citations'])} citations, {len(report.get('charts', []))} charts"
    )

    # Unauthorized access must be rejected.
    try:
        get(f"/api/research/{job_id}/report")
    except urllib.error.HTTPError as exc:
        assert exc.code == 403, f"expected 403 without token, got {exc.code}"
        print("token enforcement OK")
    else:
        print("FAIL: report accessible without a token")
        return 1

    pdf, pdf_type = get_bytes(
        token_path(f"/api/research/{job_id}/export/pdf", token)
    )
    assert pdf.startswith(b"%PDF"), f"PDF export has no PDF header ({len(pdf)} bytes)"
    assert "pdf" in pdf_type, pdf_type
    print(f"pdf OK: {len(pdf)} bytes")

    slides, slides_type = get_bytes(
        token_path(f"/api/research/{job_id}/export/slides", token)
    )
    assert b"<html" in slides.lower(), "slides export is not HTML"
    assert "html" in slides_type, slides_type
    print(f"slides OK: {len(slides)} bytes")

    docx, docx_type = get_bytes(
        token_path(f"/api/research/{job_id}/export/docx", token)
    )
    assert docx.startswith(b"PK"), "DOCX export is not a ZIP container"
    print(f"docx OK: {len(docx)} bytes")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print(f"Cannot reach {BASE}: {exc}")
        raise SystemExit(2) from exc
