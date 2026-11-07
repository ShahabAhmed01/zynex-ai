# Deployment

Zynex runs as a single Python service or container. This guide covers the provided deployment files and the operational details that matter for research jobs.

## Before you deploy

- Use **one Uvicorn worker**. Research jobs, report data, and access tokens live in process memory.
- Research jobs expire after **two hours** and are lost on restart.
- Permit outbound HTTPS to `openrouter.ai` and DuckDuckGo search endpoints.
- A key is optional: without `OPENROUTER_API_KEY`, the app serves labelled demo content while still searching the live web.
- If you enable OAuth activation, the process needs write access to `.env` at the project root. On ephemeral hosts, set the key through the platform's environment variables instead.

## Environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | No | empty | Empty enables demo mode. |
| `DEFAULT_MODEL` | No | `google/gemma-4-31b-it:free` | Any OpenRouter model ID. |
| `MAX_TOKENS` | No | `4096` | Output cap per LLM request. |
| `HOST` | No | `0.0.0.0` | Use `0.0.0.0` in containers. |
| `PORT` | Host-dependent | `8000` | Render/Railway usually inject this. |
| `RELOAD` | No | `true` in `run.py` | Set `false` in production. |
| `CORS_ORIGINS` | No | localhost origins | Only needed for a separately hosted frontend. |

## Local production run

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export RELOAD=false
export OPENROUTER_API_KEY=sk-or-v1-...
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Terminate TLS at a reverse proxy (Caddy, Nginx, or your platform) and forward to the app. The app already sends CSP and frame-protection headers; do not weaken them at the proxy.

## Render

The repository contains `render.yaml` as a Blueprint:

1. Push the repository to GitHub.
2. Open the [Render dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repository and apply the Blueprint.
4. Set `OPENROUTER_API_KEY` on the service if you want live model output.
5. Deploy. The health check path is `/api/health`.

The Blueprint uses the Docker runtime and the free plan. Free instances sleep when idle; the first request after sleep will be slow.

## Railway

1. Create a project and choose **Deploy from GitHub repo**.
2. Select the repository. Railway uses `railway.toml` and the `Dockerfile`.
3. Add `OPENROUTER_API_KEY` under **Variables** if needed.
4. Railway injects `PORT`.

## Docker

```bash
docker build -t zynex .
docker run --rm -p 8000:8000 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  zynex
```

Or with Compose:

```bash
docker compose up --build -d
docker compose logs -f
```

The image is a multi-stage build on `python:3.11-slim-bookworm`. It installs the Pango/Cairo libraries needed by WeasyPrint, runs as an unprivileged user, and includes a health check against `/api/health`. The Docker build is not exercised by this repository's CI; verify it in your target environment.

If you provision a key through the web UI in a container, it is written to `/app/.env`. Container filesystems are usually ephemeral, so set the environment variable for a durable deployment.

## Health checks

```bash
curl https://YOUR_HOST/api/health
```

Expected shape:

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "app": "Zynex",
  "demo_mode": false,
  "llm_model": "google/gemma-4-31b-it:free",
  "llm_configured": true
}
```

To verify the key against OpenRouter:

```bash
curl "https://YOUR_HOST/api/health/llm?verify=true"
```

`verification.ok` is `true` only when OpenRouter accepts the key. Without a key, the endpoint reports demo mode rather than pretending to be live.

## PDF export

WeasyPrint renders the HTML report template when its native libraries are present. If they are missing, the export engine falls back to ReportLab, which has no native dependencies. Both paths produce a real PDF; failures surface as an error instead of a placeholder file.

On Debian/Ubuntu hosts outside Docker, install the required libraries:

```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 \
  libgdk-pixbuf-2.0-0 shared-mime-info libcairo2
```

## Scaling and persistence

The current architecture intentionally stays small:

- **Scale up, not out** — one worker can handle a handful of concurrent research jobs. Search requests are serialized with a 1.5-second guard to avoid DuckDuckGo rate limits.
- **No shared queue** — horizontal replicas would fragment job state. Add Redis or a database-backed job store before running multiple workers or replicas.
- **Client history** — conversations and report metadata live in browser `localStorage`. Clearing site data removes them.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Research fails immediately | DuckDuckGo returned no results or the network blocks it. Retry after a minute. |
| 403 on a report URL | Missing or wrong `token` query parameter; tokens are per job and expire with it. |
| 404 on a report URL | Job expired, the server restarted, or the job ID is unknown. |
| Chat returns a provider error | Invalid/expired OpenRouter key, unavailable model, or provider outage. Check server logs. |
| PDF is missing fonts or layout differs | WeasyPrint native libraries are unavailable and the ReportLab fallback is active. |
| Activation succeeds but live mode stays off | `.env` is not writable or the key was rejected; set `OPENROUTER_API_KEY` in the environment and restart. |
