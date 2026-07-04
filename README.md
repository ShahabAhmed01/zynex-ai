# Zynex AI

An intelligent AI assistant with streaming chat and autonomous research capabilities.

<p align="center">
  <a href="https://github.com/ShahabAhmed01/zynex-ai/actions"><img src="https://img.shields.io/github/actions/workflow/status/ShahabAhmed01/zynex-ai/ci.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
</p>

## Features

- **Streaming Chat**: Real-time AI responses with markdown rendering via Server-Sent Events
- **Research Agent**: 6-stage autonomous research pipeline with multi-source verification
- **Multiple Models**: Dynamic model switching — Gemini 2.0 Flash, GPT-OSS 120B, GLM 4.5 Air (all free)
- **Conversation History**: Persistent chat history with localStorage, date-grouped sidebar
- **Mobile Responsive**: Optimized for all device sizes with touch interactions and swipe gestures
- **Docker Support**: Production-ready multi-stage containerization with health checks

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ HTML     │  │ CSS      │  │ JavaScript (ES6)      │ │
│  │ Semantic │  │ BEM      │  │ chat.js / streaming.js│ │
│  │ markup   │  │ modules  │  │ markdown.js / ui.js   │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST /api/chat (SSE)
┌────────────────────▼────────────────────────────────────┐
│               FastAPI Backend (Python)                   │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Router   │  │ OpenAI Svc   │  │ Middleware         │ │
│  │ /api/*   │  │ AsyncOpenAI  │  │ CORS, Rate Limit  │ │
│  └──────────┘  └──────────────┘  └───────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (streaming)
┌────────────────────▼────────────────────────────────────┐
│              OpenRouter API (LLM Gateway)                │
│  Gemini 2.0 Flash | GPT-OSS 120B | GLM 4.5 Air         │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/ShahabAhmed01/zynex-ai.git
cd zynex-ai

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run development server (no .env needed — use in-app OAuth)
python run.py
```

Open **http://localhost:8000** and click "Activate Free AI" to auto-provision your API key.

### Docker

```bash
# Build image
docker build -t zynex-ai .

# Run container
docker run -p 8000:8000 zynex-ai
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Configuration

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `OPENROUTER_API_KEY` | No | — | OpenRouter API key (free tier available) |
| `DEFAULT_MODEL` | No | `google/gemini-2.0-flash-001` | Model ID fallback |
| `HOST` | No | `0.0.0.0` | Socket bind address |
| `PORT` | No | `8000` | HTTP port |
| `MAX_TOKENS` | No | `2048` | Max output tokens per request |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Streaming chat (SSE) |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/research` | Start research job |
| `GET` | `/api/research/{id}/status` | Research status |

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vanilla HTML5, CSS3 (BEM), ES6 Modules | Zero-dependency, microsecond interaction |
| **Backend** | FastAPI, Uvicorn, Pydantic | Async ASGI processing |
| **LLM** | OpenRouter via OpenAI SDK | Multi-model access with free tier |
| **Styling** | CSS Custom Properties | Design system tokens (Inter, JetBrains Mono) |
| **Container** | Docker multi-stage build | Production-grade deployment |

## Development

```bash
# Run existing tests
python scripts/test_pipeline.py

# Run API end-to-end tests (requires running server)
python scripts/test_api_e2e.py
```

## Contributing

1. Fork the codebase
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push and open a PR targeting `main`

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

MIT License — [`LICENSE`](LICENSE)

```text
Copyright (c) 2026 Shahab Ahmed
```
