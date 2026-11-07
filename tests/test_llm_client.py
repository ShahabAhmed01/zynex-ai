"""LLM client tests: demo output, real-mode success, and honest failures."""

from __future__ import annotations

from types import SimpleNamespace

import httpx2
import pytest
from openai import APIStatusError

from backend.services import llm_client


def settings(*, demo: bool) -> SimpleNamespace:
    return SimpleNamespace(
        demo_mode=demo,
        has_api_key=not demo,
        DEFAULT_MODEL="test/default-model",
        MAX_TOKENS=128,
        OPENROUTER_API_KEY="" if demo else "test-key",
    )


async def test_demo_mode_returns_labelled_template(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=True))

    text = await llm_client.generate("Compose a report about batteries")
    assert "Demo mode" in text
    assert text.strip()


async def test_real_mode_returns_model_content(monkeypatch):
    captured = {}

    class FakeCompletions:
        async def create(self, **kwargs):
            captured.update(kwargs)
            message = SimpleNamespace(content="  real answer  ")
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    fake_client = SimpleNamespace(
        chat=SimpleNamespace(completions=FakeCompletions())
    )
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=False))
    monkeypatch.setattr(llm_client, "_client", fake_client)

    text = await llm_client.generate("Hello", model="test/model", max_tokens=64)
    assert text == "real answer"
    assert captured["model"] == "test/model"
    assert captured["max_tokens"] == 64


async def test_real_mode_empty_response_raises(monkeypatch):
    class FakeCompletions:
        async def create(self, **kwargs):
            message = SimpleNamespace(content="   ")
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    fake_client = SimpleNamespace(
        chat=SimpleNamespace(completions=FakeCompletions())
    )
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=False))
    monkeypatch.setattr(llm_client, "_client", fake_client)

    with pytest.raises(llm_client.LLMError, match="empty response"):
        await llm_client.generate("Hello")


async def test_real_mode_auth_error_is_not_retried_or_faked(monkeypatch):
    calls = 0

    class FakeCompletions:
        async def create(self, **kwargs):
            nonlocal calls
            calls += 1
            request = httpx2.Request(
                "POST", "https://openrouter.ai/api/v1/chat/completions"
            )
            response = httpx2.Response(401, request=request)
            raise APIStatusError("unauthorized", response=response, body=None)

    fake_client = SimpleNamespace(
        chat=SimpleNamespace(completions=FakeCompletions())
    )
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=False))
    monkeypatch.setattr(llm_client, "_client", fake_client)

    with pytest.raises(llm_client.LLMError, match="HTTP 401"):
        await llm_client.generate("Hello")
    assert calls == 1


async def test_demo_marker_is_stripped_from_report_copy(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=True))

    raw = await llm_client.generate("Compose a report about batteries")
    cleaned = llm_client.strip_demo_marker(raw)
    assert "Demo mode" not in cleaned
    assert cleaned


async def test_verify_connection_in_demo_mode(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(demo=True))

    result = await llm_client.verify_connection()
    assert result["ok"] is False
    assert result["demo_mode"] is True
    assert "demo mode" in result["message"].lower()
