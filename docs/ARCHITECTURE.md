# Architecture

## Overview

Zynex is a single FastAPI service that serves both the JSON/SSE API and the static frontend. There is no build step, database, or external frontend framework. Research jobs are kept in process memory and expire after two hours.

```text
frontend/index.html + css/ + js/
        │  same-origin HTTP + SSE
        ▼
FastAPI (backend/main.py)
        ├── routes/chat.py       → services/openai_service.py
        ├── routes/research.py   → agents/* → services/search_client.py
        ├── routes/auth.py       → OpenRouter OAuth key exchange
        ├── routes/health.py
        └── middleware/          → request IDs, rate limits, security headers
```

## Frontend

The frontend is dependency-free and uses native ES modules.

| File | Responsibility |
| --- | --- |
| `js/app.js` | View switching, sidebar and mobile behaviour, wiring, global errors |
| `js/chat.js` | Conversation state, send/render cycle, demo notices |
| `js/streaming.js` | SSE parsing with buffering and abort support |
| `js/markdown.js` | Safe markdown rendering, syntax highlighting, code copy |
| `js/research.js` | Research form, SSE progress, polling fallback, report rendering, exports, history |
| `js/config.js` | `/api/config` state, model menu, activation flow, settings modal |
| `js/storage.js` | `localStorage` for conversations and report metadata |
| `js/ui.js` | Toasts, modals, focus handling, shared DOM utilities |

The layout is mobile-first at the component level and switches to a persistent sidebar above 768px. On smaller screens the sidebar becomes an overlay; clicking the menu button or outside the panel closes it.

Markdown is rendered through a small custom renderer rather than `innerHTML` from the model. Code blocks keep their source in a data attribute so copy actions round-trip the original text.

## Backend

| Module | Responsibility |
| --- | --- |
| `backend/main.py` | App construction, lifespan task, CORS, security headers, static mount |
| `backend/config.py` | Environment-backed settings, free-model list, runtime reload |
| `backend/routes/chat.py` | Validated chat request → SSE stream |
| `backend/routes/research.py` | Job manager, six-stage pipeline, token-protected status/report/export routes |
| `backend/routes/auth.py` | OpenRouter OAuth URL construction, code exchange, `.env` write |
| `backend/routes/health.py` | Liveness, runtime summary, optional live LLM verification |
| `backend/services/llm_client.py` | Async OpenRouter client, retries, `LLMError`, demo templates |
| `backend/services/openai_service.py` | Streaming chat proxy and demo stream |
| `backend/services/search_client.py` | `ddgs` wrapper with deduplication and a 1.5s request guard |
| `backend/agents/query_planner.py` | Queries, outline, and research angles based on depth |
| `backend/agents/web_researcher.py` | Executes queries and normalizes sources |
| `backend/agents/source_analyzer.py` | Extracts facts and relevance per source |
| `backend/agents/report_composer.py` | Summary and sections with inline citations |
| `backend/agents/chart_generator.py` | Up to four light-theme PNG charts |
| `backend/agents/export_engine.py` | PDF (WeasyPrint → ReportLab fallback), DOCX, HTML slides |

## Chat flow

1. The browser posts the message history to `POST /api/chat`.
2. Pydantic validates roles and message lengths; the endpoint is limited to 20 requests/minute.
3. In demo mode, `stream_chat` yields a short labelled simulated stream.
4. In live mode, the backend calls OpenRouter with the selected model and `MAX_TOKENS`.
5. Chunks are forwarded as `data: {...}` SSE events and terminated with `data: [DONE]`.
6. If the provider fails after streaming starts, an error event is emitted. The backend does not replace the failure with template text.

## Research flow

```text
POST /api/research
  ├─ validate + sanitize topic and depth
  ├─ create job_id and random access_token
  ├─ store JobStatus and an asyncio.Queue
  └─ schedule run_pipeline in a background task

run_pipeline
  1. planning     query planner (4/6/8 queries by depth)
  2. researching  ddgs search, URL deduplication
  3. analyzing    source analyzer
  4. composing    cited report
  5. charting     up to 4 PNG charts
  6. completed    publish final progress event

GET /api/research/{job_id}/status?token=…  → SSE events + keep-alives
GET /api/research/{job_id}/poll?token=…    → JSON fallback
GET /api/research/{job_id}/report?token=…  → ResearchReport JSON
GET /api/research/{job_id}/export/*?token=…→ file download
```

The frontend prefers SSE and falls back to polling when the stream cannot be established. Every status/report/export route calls `_authorize`, which compares the supplied token against the stored token with `secrets.compare_digest`. Unknown jobs return 404; known jobs with a missing or wrong token return 403.

### Failure behavior

- **No search results** — the job fails with a message asking the user to retry, instead of inventing sources.
- **Live LLM failure** — `LLMError` propagates and the job fails with the provider error.
- **PDF dependency failure** — WeasyPrint is attempted first; if its native libraries are unavailable, ReportLab produces the PDF. Export never returns a fake PDF placeholder.
- **Job expiry** — a background task runs every 30 minutes and removes jobs older than two hours, including their queues, reports, charts, and tokens.
- **Process restart** — in-memory jobs are lost. There is no persistence layer.

## Demo mode versus live mode

Demo mode is determined solely by whether `OPENROUTER_API_KEY` is non-empty.

| Behaviour | Demo mode | Live mode |
| --- | --- | --- |
| Chat text | Simulated, labelled | OpenRouter model output |
| Research narrative | Built-in templates, labelled | OpenRouter model output |
| Web search | Real | Real |
| Citations | Real URLs from search | Real URLs from search |
| Provider failure | Not applicable | Error surfaced to the user |

The report carries a `demo_mode` flag and a visible “Demo narrative” badge. The UI banner and export disclaimers make the distinction explicit.

## Security model

- **Transport headers** — CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, restrictive referrer and permissions policies.
- **CORS** — same-origin by default; `CORS_ORIGINS` can allow a separately hosted frontend. Credentials are not allowed.
- **Input validation** — Pydantic bounds topics, depths, message roles, message sizes, and history length. `sanitize_topic` strips control characters and truncates.
- **Rate limits** — chat 20/min, research 5/min, auth 10/min per client address.
- **Job isolation** — random UUID job IDs plus separate random access tokens; constant-time token comparison.
- **Secret handling** — the OpenRouter key is read from the environment or `.env` server-side. `/api/config` and `/api/health` expose only boolean configuration state and the model ID. Keys are redacted from logs by omission, not printed.
- **OAuth flow** — the backend returns an OpenRouter authorization URL for an HTTP(S) callback; the frontend opens it and exchanges the returned code via `POST /api/auth/callback`, then stores the key in `.env` and reloads settings. The callback URL is accepted from the client, so deploy Zynex only on a host you trust.
- **SSRF surface** — the only outbound requests are fixed OpenRouter endpoints and DuckDuckGo searches. Report URLs are treated as text and are not fetched by the export engine.

## Operational constraints

- Run one Uvicorn worker. Multiple workers would each have their own in-memory job store and token map.
- Research requires outbound HTTPS access to `openrouter.ai` and DuckDuckGo endpoints. Some networks or CI runners rate-limit search; the pipeline then fails rather than fabricating results.
- PDF rendering needs Pango/Cairo for WeasyPrint. The Docker image installs them; the ReportLab fallback covers native Windows/macOS environments without them.
- OAuth activation writes `.env` on the server. On ephemeral platforms, prefer setting `OPENROUTER_API_KEY` in the platform environment for durability.

## Testing

- `tests/` uses pytest with the FastAPI `TestClient`. Demo mode is forced and the in-memory stores are reset per test.
- `scripts/test_pipeline.py` runs all six agent stages against live search in demo mode.
- `scripts/test_api_e2e.py` exercises the HTTP API, token enforcement, and all three export formats against a running server.
- CI runs `ruff`, the pytest suite on Python 3.10–3.14, and the pipeline integration test.
