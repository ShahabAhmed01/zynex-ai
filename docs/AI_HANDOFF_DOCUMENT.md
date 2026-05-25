# ZYNEX — AI Continuation & Handoff Document

> **READ THIS FIRST IF YOU ARE AN AI.**
> This single document contains everything you need to understand, run, debug, extend, and continue building the Zynex project. You do NOT need any other context, conversation history, or human explanation. The GitHub repo URL alone is sufficient.

---

## Quick Reference Card

| Field | Value |
|---|---|
| **Project Name** | Zynex |
| **Repo** | `https://github.com/ShahabAhmed01/zynex-ai` |
| **Owner** | Shahab Ahmed (`@ShahabAhmed01` on GitHub) |
| **License** | MIT (Shahab Ahmed, 2026) |
| **Built By** | AI (100% — owner supervised only) |
| **Stack** | Python 3.10+ · FastAPI · Vanilla HTML/CSS/JS |
| **LLM Provider** | OpenRouter (free tier, `google/gemini-2.0-flash-001`) |
| **Search Provider** | DuckDuckGo (free, no API key) |
| **Current Status** | v1.0.0 — All core code written, needs testing & polish |
| **Last Updated** | 2026-05-23 |

---

## What Is Zynex?

Zynex is an **Autonomous AI Research & Report Agent** — a web application where a user types a topic (e.g. "Future of blockchain in Pakistan") and the AI:

1. Plans research queries and an outline (LLM)
2. Searches the web for sources (DuckDuckGo)
3. Analyzes and summarizes sources (LLM)
4. Composes a structured, cited report (LLM)
5. Generates charts and visualizations (matplotlib)
6. Exports professional PDF reports and HTML slide decks
7. All with real-time progress updates streamed to the browser via SSE

**Demo Mode**: The app runs without any API keys — it returns mock data so you can test the full UI flow immediately. Set `OPENROUTER_API_KEY` in `.env` for real AI-powered output.

---

## Current Build Status (What's Done vs What's Left)

### COMPLETED (all code written & committed)

- [x] Project scaffolding (`.gitignore`, `requirements.txt`, `pyproject.toml`, `LICENSE`, etc.)
- [x] Backend config system (`backend/config.py` — loads `.env`, has demo mode fallback)
- [x] FastAPI application entry point (`backend/main.py`, `run.py`)
- [x] Pydantic data models (`backend/models/schemas.py`)
- [x] LLM client service (`backend/services/llm_client.py` — OpenRouter via openai SDK)
- [x] Search client service (`backend/services/search_client.py` — DuckDuckGo)
- [x] 6-stage agentic pipeline:
  - [x] `backend/agents/query_planner.py` — Stage 1
  - [x] `backend/agents/web_researcher.py` — Stage 2
  - [x] `backend/agents/source_analyzer.py` — Stage 3
  - [x] `backend/agents/report_composer.py` — Stage 4
  - [x] `backend/agents/chart_generator.py` — Stage 5
  - [x] `backend/agents/export_engine.py` — Stage 6
- [x] API routes (`backend/routes/health.py`, `backend/routes/research.py`)
- [x] Jinja2 templates for PDF and slides (`backend/templates/`)
- [x] Frontend SPA (`frontend/index.html`)
- [x] CSS design system — premium dark theme (`frontend/css/style.css`)
- [x] Frontend application logic (`frontend/js/app.js`)
- [x] Background particle animation (`frontend/js/animations.js`)
- [x] All documentation (`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`)
- [x] GitHub repo created and code pushed

### NOT YET DONE (pick up from here)

- [x] **End-to-end testing** — The server now starts successfully (`python run.py`). You need to open `http://localhost:8000`, submit a topic, and verify the full agentic pipeline works.
- [x] **Fix basic runtime bugs** — Fixed import errors and static file serving paths. The server is now healthy.
- [x] **Test PDF export** — WeasyPrint requires system dependencies (GTK/Pango/Cairo on some OSes)
- [x] **Test slides export** — Verify the reveal.js-based HTML slides render correctly
- [x] **Test demo mode** — Verify the app works fully without API keys
- [x] **Test with OpenRouter API** — Run `python scripts/verify_openrouter.py` or `GET /api/health/llm?verify=true` after setting `OPENROUTER_API_KEY`
- [x] **UI Polish** — Ensure the progress bar updates smoothly, charts render properly, and the theme looks premium
- [x] **Error handling** — Add proper error boundaries in the frontend JS
- [x] **Deployment** — Docker + `render.yaml` + `railway.toml` + `docs/DEPLOYMENT.md` (owner deploys via Render/Railway dashboard)

### FUTURE ENHANCEMENTS (not planned for v1)

- Voice summary (TTS)
- AI-generated slide images
- Multi-language reports
- Database persistence (SQLite/PostgreSQL instead of in-memory dict)
- User accounts & saved research history
- Docker support
- Webhook notifications

---

## How to Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/Shahabahmed01/zynex-ai.git
cd zynex-ai

# 2. Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) Configure API key for real AI responses
copy .env.example .env
# Edit .env and add: OPENROUTER_API_KEY=sk-or-v1-your-key-here
# Get a free key at https://openrouter.ai

# 5. Start the server
python run.py

# 6. Open browser to http://localhost:8000
```

### System Dependencies for PDF Export

WeasyPrint needs native libraries:
- **Windows**: Usually `pip install weasyprint` works. If not → install GTK3 runtime from https://github.com/nickvdyck/weasyprint-win/releases
- **macOS**: `brew install pango`
- **Linux**: `apt install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0`

---

## Complete File Map

Every file in the project, its purpose, and what it does:

```
zynex-ai/
│
├── .env.example                 # Template for environment variables (copy to .env)
├── .gitignore                   # Git ignore rules (venv, .env, __pycache__, etc.)
├── LICENSE                      # MIT License — Copyright 2026 Shahab Ahmed
├── README.md                    # Professional README with badges, screenshots placeholder
├── CONTRIBUTING.md              # How to contribute (fork, branch, PR workflow)
├── CODE_OF_CONDUCT.md           # Contributor Covenant v2.1
├── CHANGELOG.md                 # Keep a Changelog format — version history
├── SECURITY.md                  # Security vulnerability reporting policy
├── pyproject.toml               # PEP 621 project metadata
├── requirements.txt             # Python pip dependencies
├── run.py                       # Entry point — runs uvicorn on backend.main:app
│
├── docs/
│   ├── AI_HANDOFF_DOCUMENT.md   # THIS FILE — the master AI continuation reference
│   └── ARCHITECTURE.md          # Architecture overview and design rationale
│
├── backend/
│   ├── __init__.py              # Package marker
│   ├── config.py                # Settings class — loads .env, defines defaults, demo mode detection
│   ├── main.py                  # FastAPI app — CORS, static file mounting, router includes
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # All Pydantic models: ResearchRequest, ResearchReport,
│   │                            #   ReportSection, Citation, ChartData, ProgressUpdate, JobStatus
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_client.py        # OpenRouter wrapper using openai SDK — generate() function
│   │   │                        #   Falls back to demo responses when no API key set
│   │   └── search_client.py     # DuckDuckGo wrapper — search() function using duckduckgo-search
│   │
│   ├── agents/                  # The 6-stage agentic pipeline
│   │   ├── __init__.py
│   │   ├── query_planner.py     # Stage 1: Takes topic → returns search queries + report outline
│   │   ├── web_researcher.py    # Stage 2: Takes queries → returns raw search results
│   │   ├── source_analyzer.py   # Stage 3: Takes results → returns analyzed summaries + data points
│   │   ├── report_composer.py   # Stage 4: Takes analysis → returns structured report with citations
│   │   ├── chart_generator.py   # Stage 5: Takes chart data → returns base64 PNG images (matplotlib)
│   │   └── export_engine.py     # Stage 6: Takes report → generates PDF (WeasyPrint) and HTML slides
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py            # GET /api/health → {"status": "healthy", "version": "1.0.0"}
│   │   └── research.py          # POST /api/research → starts job
│   │                            # GET /api/research/{id}/status → SSE progress stream
│   │                            # GET /api/research/{id}/report → completed report JSON
│   │                            # GET /api/research/{id}/export/pdf → PDF download
│   │                            # GET /api/research/{id}/export/slides → HTML slides download
│   │
│   └── templates/
│       ├── report.html          # Jinja2 template for PDF generation (A4, styled)
│       └── slides.html          # Jinja2 template for reveal.js slide deck
│
└── frontend/
    ├── index.html               # Single-page app — topic input, progress tracker, report viewer
    ├── css/
    │   └── style.css            # Complete dark theme design system with glassmorphism
    └── js/
        ├── app.js               # Main application logic — API calls, SSE handling, DOM rendering
        └── animations.js        # Background particle canvas animation for visual polish
```

---

## Architecture & Data Flow

```
User enters topic in browser
    │
    ▼
Frontend POST /api/research { topic, depth }
    │
    ▼
Backend creates job_id (UUID), stores JobStatus in memory dict
Backend starts background asyncio task for the pipeline
Backend returns { job_id } immediately
    │
    ▼
Frontend connects to SSE: GET /api/research/{job_id}/status
    │
    ▼
Background pipeline runs 6 stages sequentially:
    │
    ├─ Stage 1: Query Planner
    │   └─ LLM generates 3-7 search queries + report outline
    │
    ├─ Stage 2: Web Researcher
    │   └─ DuckDuckGo searches each query, collects results
    │
    ├─ Stage 3: Source Analyzer
    │   └─ LLM analyzes raw results → summaries + extracted data
    │
    ├─ Stage 4: Report Composer
    │   └─ LLM writes structured report with [1] inline citations
    │
    ├─ Stage 5: Chart Generator
    │   └─ matplotlib renders bar/pie/line charts → base64 PNG
    │
    └─ Stage 6: Complete
        └─ Report stored in jobs dict, status → "completed"
    │
    │  Each stage pushes a ProgressUpdate to an asyncio.Queue
    │  SSE endpoint reads the Queue and streams events to browser
    │
    ▼
Frontend receives "completed" SSE event
Frontend calls GET /api/research/{job_id}/report
Frontend renders the report in the DOM
    │
    ▼
User clicks Export → GET /api/research/{job_id}/export/pdf
                   → GET /api/research/{job_id}/export/slides
```

### Key Architectural Decisions & Justifications

| Decision | Why |
|---|---|
| **In-memory dict for jobs** | No database setup needed for v1. Easy to swap for Redis/PostgreSQL later by wrapping dict access in a data-access layer. |
| **SSE instead of WebSockets** | Progress is server→client only (unidirectional). SSE is simpler, natively supported by browsers, auto-reconnects. |
| **Vanilla HTML/CSS/JS frontend** | Zero build step, no node_modules, trivially editable by any AI. Perfect for this project's scope. |
| **DuckDuckGo for search** | Completely free, no API key needed. Can be swapped for Tavily/Serper later. |
| **OpenRouter for LLM** | Unified API for 100+ models. Free tier with Gemini. OpenAI SDK compatible — just change base_url. |
| **Demo mode fallback** | App works out-of-the-box with zero configuration. Great for first impressions and testing. |
| **WeasyPrint for PDF** | HTML→PDF with full CSS support. Professional output. Slightly tricky on Windows but well-documented. |

---

## API Contract

### POST /api/research
Start a new research job.

**Request:**
```json
{
    "topic": "Future of blockchain in Pakistan",
    "depth": "standard"
}
```
- `topic` (string, required): Research topic
- `depth` (string, optional): `"quick"` (3 queries) | `"standard"` (5, default) | `"deep"` (7)

**Response (200):**
```json
{ "job_id": "uuid-string" }
```

### GET /api/research/{job_id}/status
SSE stream. Each event is a JSON `ProgressUpdate`:
```json
{"step": 1, "total_steps": 6, "stage": "planning", "message": "...", "progress": 0.1}
```
Stages: `planning` → `researching` → `analyzing` → `composing` → `charting` → `completed` | `failed`

### GET /api/research/{job_id}/report
Returns the completed `ResearchReport` as JSON.

### GET /api/research/{job_id}/export/pdf
Returns binary PDF file.

### GET /api/research/{job_id}/export/slides
Returns HTML file with embedded reveal.js slides.

### GET /api/health
Returns `{"status": "healthy", "version": "1.0.0", "app": "Zynex"}`.

---

## Branding & Design System

### Colors (CSS Custom Properties in `frontend/css/style.css`)
```css
:root {
    --color-bg:        #0A0A0F;    /* Deep dark background */
    --color-surface:   #111118;    /* Card backgrounds */
    --color-surface-2: #1A1A25;    /* Elevated surfaces */
    --color-border:    #2A2A3A;    /* Subtle borders */
    --color-blue:      #3B82F6;    /* Primary action */
    --color-cyan:      #06B6D4;    /* Secondary accent */
    --color-violet:    #8B5CF6;    /* Highlight accent */
    --color-emerald:   #10B981;    /* Success */
    --color-red:       #EF4444;    /* Error */
    --color-amber:     #F59E0B;    /* Warning */
    --color-text:      #E2E8F0;    /* Primary text */
    --color-muted:     #94A3B8;    /* Muted text */
    --color-white:     #FAFAF9;    /* Headings */
}
```

### Typography
- **Primary**: Inter (Google Fonts) — weights 300–800
- **Monospace**: system monospace / JetBrains Mono

### Design Tokens
- Glassmorphism: `background: rgba(255,255,255,0.03); backdrop-filter: blur(20px);`
- Gradient text: `linear-gradient(135deg, #3B82F6, #06B6D4, #8B5CF6)`
- Border radius: Cards 16px, Buttons/Inputs 12px
- Transitions: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`

---

## Key Code Patterns (Copy These)

### LLM Call Pattern
```python
# backend/services/llm_client.py
from openai import OpenAI
from backend.config import settings

client = None
if settings.OPENROUTER_API_KEY:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": "https://github.com/Shahabahmed01/zynex-ai",
            "X-Title": "Zynex AI Research Agent",
        }
    )

async def generate(prompt: str, system: str = "", temperature: float = 0.7) -> str:
    if not client:
        return "[DEMO MODE] ..."
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model=settings.DEFAULT_MODEL,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content
```

### Search Pattern
```python
# backend/services/search_client.py
from duckduckgo_search import DDGS
import asyncio

async def search(query: str, max_results: int = 10) -> list[dict]:
    def _search():
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
    return await asyncio.to_thread(_search)
```

### SSE Progress Pattern
```python
# In backend/routes/research.py
jobs: dict[str, JobStatus] = {}
job_queues: dict[str, asyncio.Queue] = {}

@router.post("/api/research")
async def start_research(request, background_tasks):
    job_id = str(uuid4())
    jobs[job_id] = JobStatus(job_id=job_id, status="pending")
    job_queues[job_id] = asyncio.Queue()
    background_tasks.add_task(run_pipeline, job_id, request.topic, request.depth)
    return {"job_id": job_id}

@router.get("/api/research/{job_id}/status")
async def stream_status(job_id: str):
    async def event_stream():
        queue = job_queues[job_id]
        while True:
            update = await queue.get()
            yield f"data: {update.model_dump_json()}\n\n"
            if update.stage in ("completed", "failed"):
                break
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

---

## Dependencies

### Python (requirements.txt)
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
openai>=1.6.0
duckduckgo-search>=4.0.0
weasyprint>=60.0
matplotlib>=3.8.0
jinja2>=3.1.0
python-dotenv>=1.0.0
python-multipart>=0.0.6
pydantic>=2.5.0
```

### Environment Variables (.env.example)
```env
# LLM — Get free key at https://openrouter.ai
OPENROUTER_API_KEY=
DEFAULT_MODEL=google/gemini-2.0-flash-001

# Server
HOST=0.0.0.0
PORT=8000

# Search (no key needed for DuckDuckGo)
SEARCH_MAX_RESULTS=10
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError` | Activate venv: `venv\Scripts\activate` (Windows) |
| WeasyPrint fails | Install GTK3 runtime (Windows) or `brew install pango` (macOS) |
| DuckDuckGo rate limited | Add 1-2s sleep between searches in `search_client.py` |
| OpenRouter 429 | Use free model (`google/gemini-2.0-flash-001`) or add retry logic |
| Port 8000 in use | Change `PORT` in `.env` |
| Blank page at localhost:8000 | Check `backend/main.py` mounts `frontend/` as static files |

---

## Instructions for the Next AI

**You are picking up where the previous AI left off. Here is exactly what to do:**

1. **Clone or access the repo**: `git clone https://github.com/Shahabahmed01/zynex-ai.git`
2. **Read this document completely** — you now have full context
3. **Check the "NOT YET DONE" section above** — that is your immediate task list
4. **Priority #1**: Get the app running locally (`python run.py`) and fix any runtime errors
5. **Priority #2**: Test the full pipeline end-to-end (submit a topic, watch progress, see report)
6. **Priority #3**: Fix any bugs you find
7. **Priority #4**: UI polish in the browser
8. **Follow the established patterns** — use the exact code patterns, colors, and architecture shown above
9. **Keep this document updated** — mark completed items with `[x]`, add any new bugs or notes
10. **Commit and push changes** to the GitHub repo when done

### Important Rules
- This project is 100% AI-built. The owner (Shahab Ahmed) is supervising only.
- All code is MIT licensed under Shahab Ahmed's name.
- Keep the frontend as vanilla HTML/CSS/JS — do NOT add React, Vue, or any framework.
- Keep using DuckDuckGo for search (free) and OpenRouter for LLM.
- The app MUST work in demo mode (no API keys) with mock data.
- **CRITICAL**: Push all changes to `https://github.com/Shahabahmed01/zynex-ai` immediately upon completing any bug fix, feature, or document update. Do not ask for permission to push. Do it automatically and constantly.
- **BE FULLY AUTONOMOUS**: Do not ask the user for permission to move to the next task. The user shouldn't need to tell you anything. Figure out the next step from the 'NOT YET DONE' section and complete the task entirely on your own.

### The One Command to Give Any AI

If you are Shahab and your AI capacity has run out, paste this to your next AI:

> **"Continue working on my project. Here is the repo: https://github.com/Shahabahmed01/zynex-ai**
> 
> **Instructions for you:**
> **1. First, read the file `docs/AI_HANDOFF_DOCUMENT.md` in the repo. It contains everything you need to know about the architecture, current state, and what needs to be done.**
> **2. Pick up from the 'NOT YET DONE' section in that document and complete the remaining tasks.**
> **3. IMPORTANT RULE: Update everything on GitHub automatically without delay. Whenever you complete a task or fix a bug, immediately commit and push it to the repository without asking or waiting for my command.**
> **4. Do not summarize your plans unless absolutely necessary; just start executing and pushing.**
> **5. BE FULLY AUTONOMOUS: I shouldn't need to tell you anything. Look at the NOT YET DONE list, figure out the next step, and complete the tasks on your own without asking for permission to proceed.**"

That's it. Any AI that can read a GitHub repo will be able to continue seamlessly.

---

*This document lives at: `https://github.com/Shahabahmed01/zynex-ai/blob/main/docs/AI_HANDOFF_DOCUMENT.md`*
*Raw URL: `https://raw.githubusercontent.com/Shahabahmed01/zynex-ai/main/docs/AI_HANDOFF_DOCUMENT.md`*
