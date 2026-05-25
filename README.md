# AIProjecTy

> **Intelligent conversational AI interface** — A production-grade web application providing a seamless, single-screen chat experience powered by OpenAI's language models, built with a FastAPI backend and a zero-dependency vanilla frontend.

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-8B5CF6?style=flat-square)](https://railway.app)

---

## Overview

AIProjecTy is a lightweight, self-hostable AI chat application that delivers a ChatGPT-like experience with real-time streaming responses, conversation persistence, and a polished single-screen UI — all without a heavy frontend framework.

### Key Features

- **Real-time streaming** — Token-by-token response streaming via Server-Sent Events (SSE), with a live progress bar and animated cursor
- **Single-screen layout** — Everything fits one viewport; no page redirects, no scrolling outside the message area
- **Conversation history** — Sidebar with localStorage-backed history; resume any past session
- **Multi-model switching** — Switch between GPT-4o, GPT-4o-mini, and GPT-3.5-turbo without leaving the chat
- **Markdown rendering** — Code blocks, bold/italic, headings, and lists rendered inline
- **Fully responsive** — Collapsible sidebar for mobile; adaptive layout down to 320 px
- **Zero client dependencies** — Pure HTML/CSS/JS frontend; no React, no Webpack, no build step

---

## Architecture

```
aiprojecty/
├── backend/
│   ├── main.py          # FastAPI app, CORS, SSE streaming endpoint
│   ├── config.py        # Settings via Pydantic BaseSettings (.env)
│   ├── routes/          # Route modules (chat, health)
│   ├── services/        # OpenAI client, streaming logic
│   └── middleware/      # Rate limiting, request logging
├── frontend/
│   ├── index.html       # Single-file UI shell
│   ├── js/app.js        # All client logic (state, rendering, SSE)
│   └── favicon.svg      # Vector icon
├── docs/
│   ├── ARCHITECTURE.md  # System design deep-dive
│   └── DEPLOYMENT.md    # Cloud deployment guides
├── Dockerfile
├── railway.toml
├── render.yaml
└── pyproject.toml
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed system diagram and design decisions.

---

## Quick Start

### Prerequisites

- Python 3.10+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Local Development

```bash
# 1. Clone
git clone https://github.com/Shahabahmed01/aiprojecty.git
cd aiprojecty

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY

# 5. Run
python run.py
# → http://localhost:8000
```

The frontend is served as static files by FastAPI itself — no separate dev server needed.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| OPENAI_API_KEY | ✅ | — | Your OpenAI secret key |
| OPENAI_DEFAULT_MODEL | ❌ | gpt-4o | Default model |
| HOST | ❌ | 0.0.0.0 | Bind address |
| PORT | ❌ | 8000 | Bind port |
| CORS_ORIGINS | ❌ | * | Allowed CORS origins (comma-separated) |
| MAX_TOKENS | ❌ | 2048 | Max tokens per response |
| RATE_LIMIT | ❌ | 60 | Requests per minute per IP |

---

## API Reference

### POST /api/chat 

Send a message and receive a streaming response.

**Request**

```json
{
  "messages": [
    { "role": "user", "content": "Explain quantum entanglement simply." }
  ],
  "model": "gpt-4o",
  "stream": true
}
```

**Response** — Content-Type: text/event-stream 

```
data: {"choices":[{"delta":{"content":"Quantum "}}]}
data: {"choices":[{"delta":{"content":"entanglement..."}}]}
data: [DONE]
```

### GET /api/health 

Returns server status and model availability.

```json
{ "status": "ok", "model": "gpt-4o", "version": "1.0.0" }
```

---

## Deployment

### Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/aiprojecty)

1. Click the button above or create a new Railway project from this repo
2. Set OPENAI_API_KEY in Environment Variables
3. Railway auto-detects railway.toml and deploys

### Render

1. Create a new **Web Service** on [Render](https://render.com) pointed at this repo
2. Build command: pip install -r requirements.txt 
3. Start command: python run.py 
4. Set OPENAI_API_KEY in Environment

### Docker

```bash
docker build -t aiprojecty .
docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... aiprojecty
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full cloud deployment guides including custom domains, SSL, and scaling.

---

## Development

### Running Tests

```bash
pip install pytest httpx pytest-asyncio
pytest tests/ -v
```

### Code Style

```bash
pip install ruff black
ruff check backend/
black backend/
```

### Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request process, code standards, and community guidelines.
