# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Restored the autonomous research workspace: topic/depth form, six-stage progress stream, report reader, chart grid, citations, history, and PDF/DOCX/slides/Markdown actions.
- Restored one-click OpenRouter activation and the settings panel in the web UI, including live demo/live status.
- Added a verified free-model catalog (Gemma 4 31B, Nemotron 3.5 Lightning, Nemotron 3 Ultra 550B) with runtime reload after key provisioning.
- Added a ReportLab PDF fallback for environments where WeasyPrint's native Pango libraries are unavailable.
- Added per-job access tokens for research status, report, and export routes.
- Added request validation for chat roles/messages, research topics/depths, and OAuth callback values.
- Added CSP, frame protection, permissions, and referrer headers to every response.
- Added pytest coverage for API contracts, schemas, token enforcement, exports, and LLM failure behavior.
- Added a CI workflow that lints, runs tests on Python 3.10–3.13, and exercises the research pipeline.
- Added Dependabot configuration, structured issue forms, and a pull-request template.
- Added fresh product screenshots and a social preview asset under `docs/assets/`.

### Changed
- Migrated web search to the maintained `ddgs` package.
- Increased the default output token limit to 4096 and aligned configuration, compose, and deployment files.
- Charts now render with the light UI theme, deduplicate identical specifications, and cap at four per report.
- The research composer strips the chat-only demo footer from report copy; the UI and exports still carry explicit demo disclaimers.
- Documentation now reflects the actual models, endpoints, configuration, architecture, and deployment constraints.
- The mobile sidebar now stays open when the menu button's icon is clicked.

### Fixed
- Live-mode LLM failures are no longer silently replaced with fabricated template text; chat emits an error event and research jobs fail with the provider error.
- PDF export no longer returns a fake or empty file when rendering fails.
- Research status/report/export endpoints now reject missing or incorrect access tokens.
- Research jobs now publish a final event and clean up queues, tokens, reports, and charts on expiry.
- Health/config responses now report the current model and key state after runtime reload.
- Fixed stale model IDs, token limits, and endpoint lists across docs and deployment files.

### Security
- Added rate limits to chat (20/min), research (5/min), and auth (10/min).
- Added input sanitization and length bounds before prompts reach an LLM.
- Added constant-time comparison for research access tokens.
- Removed retired provider configuration and stopped exposing secrets in public configuration responses.

## [2.0.0] - 2026-05-24

### Security
- Added rate limiting with slowapi (5 requests/minute per IP)
- Added input sanitization to prevent prompt injection attacks
- Added job access tokens for securing job-related endpoints
- Added safe URL fetcher for WeasyPrint to prevent SSRF attacks

### Quality
- Parallelized LLM calls in report composer for faster generation
- Parallelized source analysis for improved performance
- Fixed search_multiple dead code in web_researcher
- Fixed demo mode JSON responses to prevent parse errors
- Added structured JSON logging with python-json-logger
- Added request ID middleware for better request tracing

### Features
- Added report history (localStorage) - stores last 5 reports
- Added shareable report URLs with job_id and access_token
- Added Chart.js for interactive charts (canvas-based rendering)
- Added DOCX export functionality using python-docx
- Added SVG favicon and PWA manifest for better mobile support
- Added report print styles for better printing experience
- Added demo mode banner to warn users when running without API key
- Added error page for failed jobs with retry option

### Bug Fixes
- Fixed report.title field does not exist (use report.topic)
- Fixed charts never displayed in report view
- Fixed CORS misconfiguration
- Fixed temp files never deleted (disk leak)
- Fixed SSE polling fallback wrong endpoint
- Fixed memory leak in job storage
- Fixed word_count field missing
- Fixed formatMarkdown breaks URLs
- Removed venv from Git tracking
- Moved imports to top of file

### UI Improvements
- Mobile responsive layout already present
- Report sidebar with TOC already present
- Progress screen already present
- Report section card design already present
- Charts grid CSS already present
- Action buttons row already present
- Footer already present

### Dependencies
- Added slowapi>=0.1.9
- Added python-json-logger>=2.0.7
- Added python-docx>=1.1.0

## [1.0.0] - 2026-05-23

### Added
- Initial release of the Zynex AI Research Agent.
- Agentic 6-stage pipeline (Query Planner, Web Researcher, Source Analyzer, Report Composer, Chart Generator, Export Engine).
- Integration with DuckDuckGo Search (no API key required).
- Integration with OpenRouter (free LLM models).
- PDF and slide deck generation using WeasyPrint and Jinja2.
- Server-Sent Events (SSE) for streaming real-time progress updates to the frontend.
- Premium dark theme UI with glassmorphism effects.
- Demo mode fallback logic when no API key is provided.
- Comprehensive documentation including AI Handoff Document, Architecture, and standard GitHub community files.
