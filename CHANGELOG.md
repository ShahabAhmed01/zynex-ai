# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Corrected swapped arguments to `compose_report` in the research pipeline.
- Progress bar now displays 0–100% from fractional SSE `progress` values.
- Aligned frontend progress step IDs with backend stages (`charting`, `completed`).
- Fallback source when web search returns no results.

### Added
- GitHub Actions CI workflow and integration test scripts.
- Enterprise-style README and deployment documentation links.

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
