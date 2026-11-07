"""API contract tests for health, config, security headers, chat, and research."""

from __future__ import annotations

from backend import __version__
from backend.routes import research


def test_health_reports_demo_mode(client):
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == __version__
    assert data["app"] == "Zynex"
    assert data["demo_mode"] is True
    assert data["llm_configured"] is False


def test_config_exposes_free_models_without_secrets(client):
    response = client.get("/api/config")
    assert response.status_code == 200

    data = response.json()
    assert data["demo_mode"] is True
    assert data["has_api_key"] is False
    assert data["default_model"] in {model["id"] for model in data["free_models"]}
    assert len(data["free_models"]) >= 2
    assert "OPENROUTER_API_KEY" not in data
    assert "api_key" not in data


def test_security_headers_applied(client):
    response = client.get("/api/health")
    headers = response.headers

    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]
    assert "object-src 'none'" in headers["Content-Security-Policy"]


def test_frontend_index_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Zynex" in response.text


def test_research_rejects_short_topic(client):
    response = client.post("/api/research", json={"topic": "x", "depth": "quick"})
    assert response.status_code == 422


def test_research_rejects_unknown_depth(client):
    response = client.post(
        "/api/research",
        json={"topic": "A valid research topic", "depth": "unlimited"},
    )
    assert response.status_code == 422


def test_research_tokens_are_required(client, monkeypatch):
    async def fake_pipeline(job_id: str, topic: str, depth: str) -> None:
        return None

    monkeypatch.setattr(research, "run_pipeline", fake_pipeline)

    response = client.post(
        "/api/research",
        json={"topic": "Token protected research", "depth": "quick"},
    )
    assert response.status_code == 200

    payload = response.json()
    job_id = payload["job_id"]
    token = payload["access_token"]
    assert token and token != job_id

    # Unknown job -> 404 before any token information can leak.
    assert client.get("/api/research/unknown/report").status_code == 404

    # Known job, missing or wrong token -> 403.
    assert client.get(f"/api/research/{job_id}/report").status_code == 403
    assert (
        client.get(f"/api/research/{job_id}/report?token=wrong").status_code == 403
    )

    # Valid token but no report yet -> 404.
    assert (
        client.get(f"/api/research/{job_id}/report?token={token}").status_code
        == 404
    )

    poll = client.get(f"/api/research/{job_id}/poll?token={token}")
    assert poll.status_code == 200
    assert poll.json()["report_ready"] is False


def test_chat_rejects_invalid_payloads(client):
    assert (
        client.post("/api/chat", json={"messages": [{"role": "tool", "content": "hi"}]})
        .status_code
        == 422
    )
    assert (
        client.post("/api/chat", json={"messages": [{"role": "user", "content": ""}]})
        .status_code
        == 422
    )
    assert client.post("/api/chat", json={"messages": []}).status_code == 422


def test_chat_demo_stream_is_labelled(client):
    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hello"}], "stream": True},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "data:" in response.text
    assert "[DONE]" in response.text
    assert "demo mode" in response.text.lower()


def test_auth_url_validation(client):
    assert client.get("/api/auth/url").status_code == 422
    assert (
        client.get("/api/auth/url", params={"callback_url": "javascript:alert(1)"})
        .status_code
        == 400
    )

    response = client.get(
        "/api/auth/url",
        params={"callback_url": "http://127.0.0.1:8000/"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["url"].startswith("https://openrouter.ai/auth?callback_url=")
    assert data["demo_mode"] is True


def test_auth_callback_rejects_blank_code(client):
    response = client.post("/api/auth/callback", json={"code": "  "})
    assert response.status_code == 400
