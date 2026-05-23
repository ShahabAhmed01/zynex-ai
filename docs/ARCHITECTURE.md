# Zynex Architecture

## Overview
Zynex is built with an agentic architecture designed for autonomous research. The system is split between a FastAPI backend that handles the heavy lifting of LLM interactions and web searching, and a lightweight vanilla JS frontend.

## Pipeline Architecture
The research pipeline consists of 6 sequential stages:

1. **Query Planner**: Uses an LLM to expand a user topic into 5-7 specific search queries and an overall report outline.
2. **Web Researcher**: Takes those queries and uses DuckDuckGo to search the live web. It deduplicates URLs and extracts snippets.
3. **Source Analyzer**: Uses an LLM to read the search snippets, extract key facts, and identify data points suitable for charts.
4. **Report Composer**: Uses an LLM to write the final structured report based on the outline and analyzed sources.
5. **Chart Generator**: Uses `matplotlib` to render charts from the extracted data, saving them as base64 images.
6. **Export Engine**: Uses `weasyprint` and `jinja2` to render the report into a PDF or HTML slide deck.

## Data Flow
- Communication between frontend and backend is over REST.
- Long-running research tasks stream their status back to the client using **Server-Sent Events (SSE)**.
- Jobs and their states are stored entirely in memory (via Python dicts).

## Security & Privacy
- **API Keys**: No API keys are committed to the repository. The application relies on environment variables via `.env`.
- **Search Privacy**: DuckDuckGo is used, offering search privacy out of the box without tracking.
- **LLM Usage**: OpenRouter serves as an intermediary, and we default to free tier models, keeping costs at $0 while preventing direct exposure of proprietary keys.
