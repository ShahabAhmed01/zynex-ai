# 🔄 ZYNEX — Complete AI Handoff & Continuation Document

> **🔗 GitHub**: https://github.com/Shahabahmed01/zynex-ai  
> **📂 Project Location (Local)**: `c:\Users\Shahab Ahmed\Documents\aiprojecty`  
> **👤 Owner**: Shahab Ahmed (GitHub: [@Shahabahmed01](https://github.com/Shahabahmed01))  
> **🤖 Built By**: AI (Google DeepMind's Antigravity)  
> **📅 Last Updated**: 2026-05-23

---

## 🎯 Purpose of This Document

**If you are an AI reading this**: This document contains EVERYTHING you need to understand, maintain, debug, extend, or continue building the Zynex project. Read it completely before making any changes.

**If you are a human reading this**: This is the master reference for the entire project. It was created so that any AI assistant can pick up work on this project without needing the original conversation context.

---

## 🤖 AI Architectural Review & Justifications

To ensure this project is robust and easy for future AIs to modify, the architecture and documentation have been reviewed through multiple "AI Personas". Here are the decisions and their justifications:

### 1. Software Architect AI 🏗️
*   **Decision**: Decouple the agentic pipeline into isolated stages (Query Planner, Web Researcher, etc.).
*   **Justification**: This prevents the monolithic LLM calls from degrading. By separating concerns, each agent can have highly specialized prompts, making it easier to swap out or upgrade individual stages without breaking the whole pipeline.
*   **Decision**: Use an in-memory dictionary for job state (`jobs: dict[str, JobStatus]`).
*   **Justification**: Reduces overhead and infrastructure dependencies for a V1 MVP. Easy to migrate to Redis/PostgreSQL later by wrapping the dictionary accesses in a data-access layer.

### 2. Security & DevOps AI 🔐
*   **Decision**: No hardcoded API keys; strictly rely on `.env` files and `python-dotenv`.
*   **Justification**: Prevents accidental leakage in GitHub repositories. 
*   **Decision**: The system gracefully falls back to "Demo Mode" when API keys are absent.
*   **Justification**: Ensures the application can be cloned and run immediately by anyone, improving developer experience and preventing application crashes during initial setup.

### 3. Frontend & UX Expert AI 🎨
*   **Decision**: Vanilla HTML/CSS/JS without React/Vue/Angular.
*   **Justification**: Drastically reduces the build complexity and node_modules bloat. A single-page application (SPA) can easily be achieved with DOM manipulation for a project of this scope, making it highly portable and easier for LLMs to generate and maintain in single files.
*   **Decision**: Server-Sent Events (SSE) for progress updates instead of WebSockets.
*   **Justification**: SSE is unidirectional (Server -> Client), which perfectly maps to our use case of streaming pipeline progress. It's natively supported by browsers without requiring complex WebSocket reconnection logic.

---

## 📋 What Is Zynex?

Zynex is an **Autonomous AI Research & Report Agent** — a web application where a user enters any topic (e.g., "Future of blockchain in Pakistan") and the AI:

1. **Researches** the topic online using web search
2. **Analyzes** and summarizes sources
3. **Composes** a structured report with sections
4. **Generates** charts and data visualizations
5. **Exports** professional PDF reports and HTML slide decks
6. All with **real-time progress updates** via Server-Sent Events

### Key Design Decisions
- **FREE by default**: Works without any API keys in demo mode
- **DuckDuckGo for search**: No API key needed, completely free
- **OpenRouter for LLM**: Optional, free tier available with `google/gemini-2.0-flash-001`
- **No database**: Jobs stored in-memory (dict) for simplicity
- **No JavaScript framework**: Vanilla HTML/CSS/JS frontend
- **Python backend**: FastAPI with async support

---

## 📋 Build Progress Tracker

> **Instructions for AI**: Mark items with `[x]` as you complete them. Mark `[/]` for in-progress.

### Phase 1: Project Setup & Configuration
- [x] `run.py` — Entry point script
- [x] `.env.example` — Environment variable template
- [x] `.gitignore` — Git ignore rules
- [x] `requirements.txt` — Python dependencies
- [x] `pyproject.toml` — Python project metadata (PEP 621)

### Phase 2: Backend — Core (Python / FastAPI)
- [x] `backend/__init__.py` — Package init
- [x] `backend/config.py` — Settings loader (python-dotenv)
- [x] `backend/main.py` — FastAPI app, CORS, static files, routers
- [x] `backend/models/__init__.py` — Package init
- [x] `backend/models/schemas.py` — All Pydantic models

### Phase 3: Backend — Services
- [x] `backend/services/__init__.py` — Package init
- [x] `backend/services/llm_client.py` — OpenRouter LLM wrapper
- [x] `backend/services/search_client.py` — DuckDuckGo search wrapper

### Phase 4: Backend — Agentic Pipeline
- [x] `backend/agents/__init__.py` — Package init
- [x] `backend/agents/query_planner.py` — Stage 1: Plan research queries & outline
- [x] `backend/agents/web_researcher.py` — Stage 2: Execute web searches
- [x] `backend/agents/source_analyzer.py` — Stage 3: Analyze & summarize sources
- [x] `backend/agents/report_composer.py` — Stage 4: Compose structured report
- [x] `backend/agents/chart_generator.py` — Stage 5: Generate matplotlib charts
- [x] `backend/agents/export_engine.py` — Stage 6: PDF & slide export

### Phase 5: Backend — Routes & Templates
- [x] `backend/routes/__init__.py` — Package init
- [x] `backend/routes/health.py` — Health check endpoint
- [x] `backend/routes/research.py` — Research API + SSE progress
- [x] `backend/templates/report.html` — Jinja2 PDF template
- [x] `backend/templates/slides.html` — Jinja2 slide deck template

### Phase 6: Frontend
- [x] `frontend/index.html` — Main SPA page
- [x] `frontend/css/style.css` — Premium dark theme design system
- [x] `frontend/js/app.js` — Application logic, API calls, rendering
- [x] `frontend/js/animations.js` — Background particle canvas animation

### Phase 7: Documentation
- [x] `README.md` — Professional README with badges & architecture
- [x] `LICENSE` — MIT License (Shahab Ahmed, 2026)
- [x] `CONTRIBUTING.md` — Contribution guidelines
- [x] `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- [x] `CHANGELOG.md` — Version history (Keep a Changelog format)
- [x] `SECURITY.md` — Security policy
- [x] `docs/AI_HANDOFF_DOCUMENT.md` — This file
- [x] `docs/ARCHITECTURE.md` — Architecture deep-dive

### Phase 8: GitHub
- [ ] Initialize git repository locally
- [ ] Create GitHub repo `Shahabahmed01/zynex-ai` (public)
- [ ] Push all files to GitHub
- [ ] Verify repo is accessible and complete

### Phase 9: Verification & Testing
- [ ] Server starts without errors (`python run.py`)
- [ ] Health endpoint returns 200 (`GET /api/health`)
- [ ] Frontend loads in browser at `http://localhost:8000`
- [ ] Demo mode works end-to-end (no API keys)
- [ ] Full AI mode works (with OpenRouter key)
- [ ] PDF export generates and downloads
- [ ] Slides export generates and downloads

---

## 🎨 Branding & Design System

### Identity
| Item | Value |
|---|---|
| **Project Name** | Zynex |
| **Tagline** | AI-Powered Research. Instant Reports. |
| **Logo** | ⚡ emoji + "Zynex" text (bold, Inter font) |
| **GitHub Repo** | `zynex-ai` |

### Color Palette (CSS Custom Properties)
```css
:root {
    --color-bg:        #0A0A0F;    /* Deepest dark background */
    --color-surface:   #111118;    /* Card/panel backgrounds */
    --color-surface-2: #1A1A25;    /* Elevated surfaces */
    --color-border:    #2A2A3A;    /* Subtle borders */
    --color-blue:      #3B82F6;    /* Primary action color */
    --color-cyan:      #06B6D4;    /* Secondary accent */
    --color-violet:    #8B5CF6;    /* Highlight accent */
    --color-emerald:   #10B981;    /* Success states */
    --color-red:       #EF4444;    /* Error states */
    --color-amber:     #F59E0B;    /* Warning states */
    --color-text:      #E2E8F0;    /* Primary text */
    --color-muted:     #94A3B8;    /* Secondary/muted text */
    --color-white:     #FAFAF9;    /* Headings, bright text */
}
```

### Typography
- **Primary Font**: Inter (Google Fonts) — weights: 300, 400, 500, 600, 700, 800
- **Monospace**: JetBrains Mono / Fira Code — for code and log output
- **Import**: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`

### Design Tokens
- **Glassmorphism**: `background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08);`
- **Gradient text**: `background: linear-gradient(135deg, #3B82F6, #06B6D4, #8B5CF6); -webkit-background-clip: text;`
- **Card hover**: `transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3);`
- **Border radius**: Cards: 16px, Buttons: 12px, Inputs: 12px
- **Transitions**: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`

---

## 🏗️ Architecture

### High-Level Flow
```
User enters topic
    → Frontend POST /api/research { topic, depth }
    → Backend creates job_id, starts background asyncio task
    → Frontend connects to SSE GET /api/research/{job_id}/status
    → Background task runs 6-stage pipeline:
        Stage 1: Query Planner (LLM → search queries + outline)
        Stage 2: Web Researcher (DuckDuckGo → raw results)
        Stage 3: Source Analyzer (LLM → summaries + data)
        Stage 4: Report Composer (LLM → structured report)
        Stage 5: Chart Generator (matplotlib → base64 images)
        Stage 6: Complete (store report in memory)
    → Each stage pushes ProgressUpdate to asyncio.Queue
    → SSE endpoint reads Queue, streams to frontend
    → Frontend renders report when "completed" event arrives
    → User clicks export → GET /api/research/{job_id}/export/pdf or /slides
```

### Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vanilla HTML/CSS/JS)                                  │
│ ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│ │  Input   │ │  Progress    │ │  Report    │ │   Export     │  │
│ │  Form    │ │  Tracker     │ │  Viewer    │ │   Buttons    │  │
│ └────┬─────┘ └──────┬───────┘ └─────┬──────┘ └──────┬───────┘  │
│      │               │               │               │          │
└──────┼───────────────┼───────────────┼───────────────┼──────────┘
       │ POST          │ SSE           │ GET           │ GET
       │ /api/research │ /status       │ /report       │ /export/*
       ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI)                                               │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Routes: research.py, health.py                           │    │
│ └──────┬───────────────────────────────────────────────────┘    │
│        │                                                        │
│ ┌──────▼───────────────────────────────────────────────────┐    │
│ │ Agentic Pipeline (asyncio background task)               │    │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │    │
│ │ │ Query    │→│ Web      │→│ Source   │→│ Report   │     │    │
│ │ │ Planner  │ │Researcher│ │ Analyzer │ │ Composer │     │    │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │    │
│ │ ┌──────────┐ ┌──────────┐                                │    │
│ │ │ Chart    │→│ Export   │                                │    │
│ │ │Generator │ │ Engine   │                                │    │
│ │ └──────────┘ └──────────┘                                │    │
│ └──────────────────────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ Services: llm_client.py, search_client.py                │    │
│ └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│ OpenRouter   │    │ DuckDuckGo   │
│ (Optional)   │    │ (Free)       │
│ LLM API      │    │ Search       │
└──────────────┘    └──────────────┘
```

---

## 📡 API Contract (Full Specification)

### `POST /api/research`
Start a new research job.

**Request Body**:
```json
{
    "topic": "Future of blockchain in Pakistan",
    "depth": "standard"
}
```
- `topic` (string, required): The research topic
- `depth` (string, optional): `"quick"` | `"standard"` (default) | `"deep"`
  - quick: 3 queries, shorter analysis
  - standard: 5 queries, full analysis
  - deep: 7 queries, comprehensive analysis

**Response** (200):
```json
{
    "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### `GET /api/research/{job_id}/status`
Server-Sent Events stream for real-time progress.

**Response** (200, `text/event-stream`):
```
data: {"step": 1, "total_steps": 6, "stage": "planning", "message": "Generating research queries and outline...", "progress": 0.1}

data: {"step": 2, "total_steps": 6, "stage": "researching", "message": "Searching the web for sources...", "progress": 0.3}

data: {"step": 3, "total_steps": 6, "stage": "analyzing", "message": "Analyzing and summarizing sources...", "progress": 0.5}

data: {"step": 4, "total_steps": 6, "stage": "composing", "message": "Composing research report...", "progress": 0.7}

data: {"step": 5, "total_steps": 6, "stage": "charting", "message": "Generating charts and visualizations...", "progress": 0.85}

data: {"step": 6, "total_steps": 6, "stage": "completed", "message": "Research complete!", "progress": 1.0}
```

**Stage values**: `"planning"` → `"researching"` → `"analyzing"` → `"composing"` → `"charting"` → `"completed"` | `"failed"`

---

### `GET /api/research/{job_id}/report`
Get the completed report.

**Response** (200):
```json
{
    "topic": "Future of blockchain in Pakistan",
    "summary": "Executive summary text...",
    "sections": [
        {
            "title": "Section Title",
            "content": "Section content with [1] inline citations...",
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Chart Title",
                    "labels": ["A", "B", "C"],
                    "values": [10, 20, 30],
                    "colors": ["#3B82F6", "#06B6D4", "#8B5CF6"]
                }
            ]
        }
    ],
    "citations": [
        {
            "index": 1,
            "title": "Source Title",
            "url": "https://example.com/article",
            "snippet": "Relevant excerpt..."
        }
    ],
    "charts": { "chart_0": "base64_png_data...", "chart_1": "..." },
    "generated_at": "2026-05-23T19:15:00+05:00"
}
```

---

### `GET /api/research/{job_id}/export/pdf`
Download PDF report.

**Response** (200, `application/pdf`): Binary PDF file

---

### `GET /api/research/{job_id}/export/slides`
Download HTML slide deck.

**Response** (200, `text/html`): HTML file with embedded slides

---

### `GET /api/health`
Health check.

**Response** (200):
```json
{
    "status": "healthy",
    "version": "1.0.0",
    "uptime_seconds": 123.45
}
```

---

## 📂 Complete File Structure

```
c:\Users\Shahab Ahmed\Documents\aiprojecty\
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── LICENSE                         # MIT License (Shahab Ahmed, 2026)
├── README.md                       # Professional README with badges
├── CONTRIBUTING.md                 # Contribution guidelines
├── CODE_OF_CONDUCT.md              # Contributor Covenant v2.1
├── CHANGELOG.md                    # Version history
├── SECURITY.md                     # Security policy
├── pyproject.toml                  # Python project metadata (PEP 621)
├── requirements.txt                # Python dependencies
├── run.py                          # Entry point: python run.py
│
├── docs/
│   ├── AI_HANDOFF_DOCUMENT.md      # THIS FILE — master reference
│   └── ARCHITECTURE.md             # Architecture deep-dive
│
├── backend/
│   ├── __init__.py
│   ├── config.py                   # Settings from .env (python-dotenv)
│   ├── main.py                     # FastAPI app, CORS, static files, routers
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py              # Pydantic models for all data structures
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_client.py           # OpenRouter client via openai library
│   │   └── search_client.py        # DuckDuckGo wrapper
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── query_planner.py        # Stage 1: LLM → queries + outline
│   │   ├── web_researcher.py       # Stage 2: DuckDuckGo → raw results
│   │   ├── source_analyzer.py      # Stage 3: LLM → summaries + data
│   │   ├── report_composer.py      # Stage 4: LLM → structured report
│   │   ├── chart_generator.py      # Stage 5: matplotlib → base64 charts
│   │   └── export_engine.py        # Stage 6: Jinja2 + WeasyPrint → PDF/slides
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py               # GET /api/health
│   │   └── research.py             # All research endpoints + SSE
│   │
│   └── templates/
│       ├── report.html             # Jinja2 template for PDF
│       └── slides.html             # Jinja2 template for slide deck
│
└── frontend/
    ├── index.html                  # Main SPA page
    ├── css/
    │   └── style.css               # Dark theme design system
    └── js/
        ├── app.js                  # Application logic
        └── animations.js           # Background particle animation
```

---

## 🔑 Key Implementation Patterns

### 1. LLM Client Pattern (`backend/services/llm_client.py`)
```python
from openai import OpenAI
from backend.config import settings

# OpenRouter is OpenAI-compatible — just change base_url
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
        return "[DEMO MODE] Configure OPENROUTER_API_KEY for AI responses."
    
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    response = client.chat.completions.create(
        model=settings.DEFAULT_MODEL,  # "google/gemini-2.0-flash-001" (free)
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content
```

### 2. Search Client Pattern (`backend/services/search_client.py`)
```python
from duckduckgo_search import DDGS
import asyncio

async def search(query: str, max_results: int = 10) -> list[dict]:
    def _search():
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
    return await asyncio.to_thread(_search)
    # Returns: [{"title": ..., "href": ..., "body": ...}, ...]
```

### 3. SSE Progress Pattern (`backend/routes/research.py`)
```python
import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

# In-memory storage
jobs: dict[str, JobStatus] = {}
job_queues: dict[str, asyncio.Queue] = {}

@router.post("/api/research")
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
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

### 4. Chart Generation Pattern (`backend/agents/chart_generator.py`)
```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import io, base64

def generate_chart(chart_data: ChartData) -> str:
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor('#111118')
    ax.set_facecolor('#111118')
    
    colors = ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B']
    
    if chart_data.chart_type == "bar":
        ax.bar(chart_data.labels, chart_data.values, color=colors)
    elif chart_data.chart_type == "pie":
        ax.pie(chart_data.values, labels=chart_data.labels, colors=colors, autopct='%1.1f%%')
    
    ax.set_title(chart_data.title, color='white', fontsize=14)
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='#111118')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64
```

### 5. PDF Export Pattern (`backend/agents/export_engine.py`)
```python
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import asyncio

env = Environment(loader=FileSystemLoader("backend/templates"))

async def generate_pdf(report: ResearchReport, charts: dict) -> bytes:
    template = env.get_template("report.html")
    html_string = template.render(report=report, charts=charts)
    pdf_bytes = await asyncio.to_thread(lambda: HTML(string=html_string).write_pdf())
    return pdf_bytes
```

---

## 📦 Dependencies (requirements.txt)

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

### System Dependencies
- **WeasyPrint** needs GTK/Pango/Cairo:
  - **Windows**: `pip install weasyprint` usually works. If not, install GTK3 from https://github.com/nickvdyck/weasyprint-win/releases
  - **macOS**: `brew install pango`
  - **Linux**: `apt install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0`

---

## 🚀 How to Run

```bash
# Navigate to project
cd "c:\Users\Shahab Ahmed\Documents\aiprojecty"

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# (Optional) Add your API key
copy .env.example .env
# Edit .env → add OPENROUTER_API_KEY (get free at https://openrouter.ai)

# Start server
python run.py

# Open http://localhost:8000
```

---

## 🔧 GitHub Setup

```bash
cd "c:\Users\Shahab Ahmed\Documents\aiprojecty"

# Initialize
git init
git branch -M main

# Add all files
git add .
git commit -m "feat: initial release of Zynex AI Research Agent"

# Create repo on GitHub (user must do this):
# Option A: Go to github.com/new → name: zynex-ai → public → create
# Option B: gh repo create zynex-ai --public --source=. --push

# Add remote and push
git remote add origin https://github.com/Shahabahmed01/zynex-ai.git
git push -u origin main
```

---

## ⚠️ Known Issues & Troubleshooting

| Issue | Solution |
|---|---|
| WeasyPrint fails on Windows | Install GTK3 runtime or try `pip install weasyprint --no-cache-dir` |
| DuckDuckGo rate limited | Add 1-2s delay between searches in `search_client.py` |
| OpenRouter 429 errors | Switch model or add retry with exponential backoff |
| Port 8000 in use | Change PORT in `.env` or run with `--port 8001` |
| Import errors | Make sure you're in the project root and venv is activated |

---

## 💡 Future Enhancements (Not Implemented Yet)

These were discussed but not built in v1.0:

1. **Voice Summary** — TTS (text-to-speech) for report narration
2. **AI-Generated Slides with Images** — Rich visual presentations
3. **Multi-language Support** — Reports in multiple languages
4. **Report History** — Database persistence (SQLite/PostgreSQL)
5. **User Accounts** — Authentication and saved research
6. **Custom Report Templates** — User-uploadable templates
7. **Collaborative Editing** — Multiple users editing reports
8. **Webhook Notifications** — Notify when research completes
9. **API Rate Dashboard** — Monitor API usage
10. **Docker Support** — Containerized deployment

---

## 📝 For Any AI Continuing This Work

1. **Read this entire document first**
2. **Check the progress tracker above** — see what's done vs remaining
3. **Check the actual files** in the project directory to verify what exists
4. **Follow the established patterns** shown in the Key Implementation Patterns section
5. **Maintain the design system** — use the exact colors, fonts, and styling described
6. **Keep this document updated** — mark completed items and add any new issues
7. **Test everything** — run `python run.py` and verify in browser
8. **Push to GitHub** when changes are complete

---

*This document is part of the Zynex project repository and is automatically available at:*  
*`https://github.com/Shahabahmed01/zynex-ai/blob/main/docs/AI_HANDOFF_DOCUMENT.md`*  
*Any AI can read it via the raw GitHub URL:*  
*`https://raw.githubusercontent.com/Shahabahmed01/zynex-ai/main/docs/AI_HANDOFF_DOCUMENT.md`*
