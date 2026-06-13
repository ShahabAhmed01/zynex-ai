# Zynex

<p align="center">
  <strong>Intelligent conversational AI interface</strong> — A production-grade web application providing a seamless, single-screen chat experience powered by OpenAI's language models, built with a FastAPI backend and a zero-dependency vanilla frontend.
</p>

<p align="center">
  <a href="https://github.com/ShahabAhmed01/zynex-ai/actions"><img src="https://img.shields.io/github/actions/workflow/status/ShahabAhmed01/zynex-ai/ci.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://railway.app"><img src="https://img.shields.io/badge/Deploy-Railway-8B5CF6?style=flat-square" alt="Deploy on Railway" /></a>
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#features">Features</a> ·
  <a href="#system-architecture">Architecture</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#api">API</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Interface Showcase

<p align="center">
  <img src="demo-assets/screenshots/01-landing-page.png" alt="Landing Page" width="800"/>
  <br/><em>Clean, single-screen chat interface</em>
</p>

<p align="center">
  <img src="demo-assets/screenshots/04-generating-response.png" alt="Real-time Streaming" width="800"/>
  <br/><em>Real-time token streaming and markdown rendering</em>
</p>

---

## Overview

**Zynex** is a highly optimized, self-hostable AI chat application that delivers a ChatGPT-like experience. It features real-time Server-Sent Events (SSE) streaming, persistent conversational state management, and a zero-dependency, ultra-lightweight DOM-manipulating frontend.

The system is decoupled into two cleanly separated layers:
1. **Frontend**: Pure Vanilla HTML/CSS/JS ensuring microsecond interaction times without the overhead of Virtual DOM diffing.
2. **Backend**: An asynchronous Python API utilizing `FastAPI` and the `OpenAI` python client (via OpenRouter) for robust connection handling and parallelized non-blocking I/O.

---

## Features

| Capability | Description |
|------------|-------------|
| **Asynchronous SSE Streaming** | Response streaming via HTTP/1.1 Server-Sent Events, achieving token-by-token rendering with latency measured in milliseconds. |
| **Zero-Config OAuth** | Automatic OpenRouter API key provisioning via the web UI without manual `.env` setup. |
| **State Persistence** | Client-side memory via `localStorage`, persisting conversation chains across sessions instantly. |
| **Multi-Model Orchestration** | Dynamic swapping between free models via OpenRouter: `Gemini 2.0 Flash`, `Llama 3.3 70B`, and `DeepSeek R1`. |
| **Markdown Compilation** | Custom regular-expression based markdown renderer handling code blocks, inline styling, and structured lists on the fly. |
| **Single-Page Application (SPA)** | Entire experience is locked into a `100vh` single viewport to prevent unnecessary reflows and navigation events. |

---

## System Architecture

The architecture relies on a unidirectional data flow and non-blocking streaming. Below are the key diagrams illustrating the technical design.

### 1. High-Level Component Architecture

This flowchart outlines the macro-level relationships between the client, the API server, and external LLM services.

```mermaid
flowchart TB
    %% Client Tier
    subgraph ClientLayer ["Client Tier (Browser)"]
        UI["DOM Layout<br>(index.html)"]
        JS["State & Logic<br>(app.js)"]
        Storage[localStorage]
        
        UI <-->|Event Listeners & DOM Updates| JS
        JS <-->|Serialize/Deserialize| Storage
    end

    %% Application Tier
    subgraph AppLayer ["Application Tier (FastAPI)"]
        Router["Router<br>(routes/chat.py)"]
        Service["OpenAI Service<br>(services/openai_service.py)"]
        Middleware[CORS & Middleware]
        
        Middleware --> Router
        Router -->|Pydantic Models| Service
    end

    %% External Tier
    subgraph ExtLayer ["External Services"]
        LLM[OpenRouter API]
    end

    %% Connections
    JS -->|"HTTP POST JSON"| Middleware
    Service -->|"HTTPS Asynchronous API Call"| LLM
    LLM -.->|"Token Stream"| Service
    Service -.->|"text/event-stream (SSE)"| JS
    
    %% Styling
    classDef client fill:#1e1e24,stroke:#7c6dfa,stroke-width:2px,color:#fff
    classDef server fill:#16161a,stroke:#4ade80,stroke-width:2px,color:#fff
    classDef ext fill:#0d0d10,stroke:#e8e8ed,stroke-width:2px,color:#fff
    
    class UI,JS,Storage client
    class Router,Service,Middleware server
    class LLM ext
```

### 2. Request & Stream Sequence

The following sequence diagram demonstrates the precise lifecycle of a single user prompt, highlighting the streaming mechanics that prevent blocking the browser's main thread.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as app.js (Frontend)
    participant FastAPI as Chat Router (Backend)
    participant OpenAI as OpenRouter API

    User->>App: Submits Prompt (Enter key)
    App->>App: Update local state & Render placeholder
    App->>App: Start Progress Bar Animation
    
    App->>FastAPI: POST /api/chat (Messages Array)
    activate FastAPI
    
    FastAPI->>OpenRouter: AsyncOpenAI.chat.completions.create(stream=True)
    activate OpenRouter
    
    OpenRouter-->>FastAPI: Yield HTTP Response Stream
    
    loop Every Token
        OpenRouter-->>FastAPI: yield chunk (delta)
        FastAPI-->>App: yield SSE data: {"choices": [{"delta": {"content": "..."}}]}
        App->>App: Accumulate buffer & Render Markdown
        App->>App: Scroll window to bottom
    end
    
    OpenRouter-->>FastAPI: Stream Terminated
    deactivate OpenRouter
    
    FastAPI-->>App: yield SSE data: [DONE]
    deactivate FastAPI
    
    App->>App: Finalize render, Stop Progress Bar
    App->>App: Save full conversation to localStorage
```

### 3. Client-Side State Management

Because the application avoids complex frameworks like React, state is managed through a central reactive object, ensuring minimal memory footprint.

```mermaid
stateDiagram-v2
    [*] --> Idle: Init load
    
    Idle --> Typing: User inputs text
    Typing --> Idle: Backspace / Clear
    
    Typing --> Fetching: Send() Triggered
    
    state Fetching {
        [*] --> Initialize_Controller
        Initialize_Controller --> Streaming_Active
        Streaming_Active --> Accumulating_Tokens
        Accumulating_Tokens --> Parsing_Markdown
        Parsing_Markdown --> Updating_DOM
        Updating_DOM --> Accumulating_Tokens
    }
    
    Fetching --> Saving_History: SSE emits [DONE]
    Fetching --> Error_Handling: Network Disconnect / API Error
    
    Saving_History --> Idle: State synchronized
    Error_Handling --> Idle: Toast notification displayed
```

---

## Quick Start

**Zynex features a Zero-Config OAuth flow.** You do not need to configure an API key to launch the app!

### Prerequisites

- Python **3.10+**

### Install and run

```bash
# 1. Clone the repository
git clone https://github.com/ShahabAhmed01/zynex-ai.git
cd zynex-ai

# 2. Establish a secure virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize the server (No .env file needed!)
python run.py
```

The application mounts statically on **[http://localhost:8000](http://localhost:8000)**. 
When you open the web UI, simply click the **"Activate Free AI"** banner to instantly auto-provision your API key via OpenRouter. 

---

## Configuration

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `OPENROUTER_API_KEY` | No | — | Authentication key for OpenRouter (free tier available) |
| `DEFAULT_MODEL` | No | `google/gemini-2.0-flash-001` | Model ID fallback (free models available) |
| `HOST` | No | `0.0.0.0` | Socket bind address for Uvicorn |
| `PORT` | No | `8000` | Exposed HTTP port |
| `MAX_TOKENS` | No | `2048` | Maximum output token threshold per request |

---

## API Specification

The RESTful API is documented interactively via Swagger UI at `http://localhost:8000/docs`.

### POST `/api/chat`

**Description:** Accepts a conversational array and returns a `text/event-stream` response. Proxy-buffering is disabled (`X-Accel-Buffering: no`) to ensure zero latency on Nginx deployments.

**Request Body:**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain the mechanics of SSE." }
  ],
  "model": "gpt-4o",
  "stream": true
}
```

**SSE Response Output:**
```text
data: {"choices":[{"delta":{"content":"Server"}}]}
data: {"choices":[{"delta":{"content":"-Sent Events "}}]}
data: [DONE]
```

---

## Deployment

The repository is built for instant PaaS configuration.

| Platform | Deployment Strategy |
|----------|---------------------|
| **Railway** | Configured via [`railway.toml`](railway.toml). Auto-detects ASGI app. |
| **Render** | Configured via [`render.yaml`](render.yaml). Builds via pip. |
| **Docker** | Standardized containerization. Run via: <br>`docker build -t zynex .` <br>`docker run -p 8000:8000 -e OPENROUTER_API_KEY=... zynex` |

---

## Tech Stack

| Domain | Technology / Framework | Justification |
|--------|------------------------|---------------|
| **API Layer** | FastAPI, Uvicorn, Pydantic | High-performance ASGI processing, built-in validation. |
| **LLM Driver** | OpenRouter via OpenAI SDK (`AsyncOpenAI`) | Asynchronous socket handling for API requests with free tier access. |
| **Frontend** | Vanilla HTML5, CSS3, ES6 | Maximizes client execution speed by bypassing DOM diffing. |
| **Styling** | Native CSS Variables | Enforces strict design tokens (DM Sans, JetBrains Mono). |

---

## Contributing

We strictly follow industrial standards for PRs. Ensure all commits comply with [Conventional Commits](https://www.conventionalcommits.org/). Review the [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

1. Fork the codebase.
2. Initialize a branch: `git checkout -b feature/async-handlers`
3. Commit securely: `git commit -m "feat: implement async handlers"`
4. Push and Open a PR targeting `main`.

---

## License

This architecture is open-sourced under the **MIT License**. View [`LICENSE`](LICENSE).

```text
Copyright (c) 2026 Shahab Ahmed
```
