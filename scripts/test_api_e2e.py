#!/usr/bin/env python3
"""HTTP end-to-end test against a running Zynex server."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"
TIMEOUT = 180


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as resp:
        return json.loads(resp.read().decode())


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


def main() -> int:
    health = get("/api/health")
    assert health.get("status") == "healthy", health
    print("health OK")

    job = post("/api/research", {"topic": "AI in healthcare", "depth": "quick"})
    job_id = job["job_id"]
    print(f"job {job_id}")

    deadline = time.time() + TIMEOUT
    last_stage = None
    while time.time() < deadline:
        # Read SSE stream until completed (simple line parser)
        req = urllib.request.Request(f"{BASE}/api/research/{job_id}/status")
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
                    report = get(f"/api/research/{job_id}/report")
                    assert report.get("topic"), "missing topic"
                    assert report.get("sections"), "missing sections"
                    print(f"report OK: {len(report['sections'])} sections")
                    return 0
                if stage == "failed":
                    print("FAIL:", update.get("message"))
                    return 1
        time.sleep(0.5)

    print("TIMEOUT waiting for pipeline")
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print(f"Cannot reach {BASE}: {exc}")
        raise SystemExit(2) from exc
