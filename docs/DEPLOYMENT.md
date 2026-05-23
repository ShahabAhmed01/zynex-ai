# Zynex Deployment Guide

Deploy Zynex to any platform that runs Docker or Python 3.10+.

## Quick deploy (Render — recommended)

1. Push this repo to GitHub.
2. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect `ShahabAhmed01/zynex-ai` — Render reads `render.yaml`.
4. Set **OPENROUTER_API_KEY** in the service environment (optional; demo mode works without it).
5. Deploy. Your app URL will be `https://zynex.onrender.com` (or similar).

## Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select `zynex-ai`. Railway uses `railway.toml` + `Dockerfile`.
3. Add variable `OPENROUTER_API_KEY` in **Variables**.
4. Railway sets `PORT` automatically.

## Docker (local or VPS)

```bash
docker build -t zynex .
docker run -p 8000:8000 -e OPENROUTER_API_KEY=sk-or-v1-... zynex
```

Open `http://localhost:8000`.

## Environment variables (production)

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENROUTER_API_KEY` | No | Omit for demo mode |
| `DEFAULT_MODEL` | No | Default `google/gemini-2.0-flash-001` |
| `PORT` | Auto | Set by Render/Railway/Fly |
| `HOST` | No | Use `0.0.0.0` in containers |
| `RELOAD` | No | Set `false` in production |

## Verify OpenRouter after deploy

```bash
curl "https://YOUR-APP.onrender.com/api/health/llm?verify=true"
```

With a valid key, `verification.ok` should be `true`.

Or locally:

```bash
python scripts/verify_openrouter.py
```

## PDF export on PaaS

The included `Dockerfile` installs Pango/Cairo libraries required by WeasyPrint. Native Python builds without Docker may fail PDF export unless system packages are installed.
