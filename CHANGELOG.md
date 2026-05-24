# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
