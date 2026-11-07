# Verification Report

**Date:** 2026-11-07  
**Branch:** `launch/2026-11-07-repository-improvements`  
**Baseline commit:** `e5b1860`

## Environment

| Component | Version |
| --- | --- |
| OS | Windows (win32) |
| Python | 3.14.10 |
| FastAPI | 0.162.0 |
| Pydantic | 2.14.3 |
| OpenAI SDK | 3.46.0 |
| Ruff | 0.17.4 |
| pytest | 9.2.0 |
| Browser | Microsoft Edge via Playwright |

The repository declares support for Python 3.10+; CI covers 3.10–3.14. Local verification used 3.14.10.

## Automated results

| Check | Command | Result |
| --- | --- | --- |
| Lint | `ruff check backend tests scripts` | **Pass** — all checks passed |
| Unit/API tests | `pytest -q` | **Pass** — 31 passed, 5 third-party deprecation warnings in 3.06s |
| Research pipeline | `python scripts/test_pipeline.py` | **Pass** — 6 sections, 3 citations, 2 charts |
| HTTP end-to-end | `python scripts/test_api_e2e.py http://127.0.0.1:8011` | **Pass** — SSE stages, token enforcement, PDF/slides/DOCX |
| Browser flow | Playwright, Edge, desktop + 390×844 | **Pass** — no page errors |
| Dependency audit | `pip-audit -r requirements.txt` | **Pass** — no known vulnerabilities |
| Secret scan | `gitleaks detect --redact` (63 commits, all refs) | **Pass** — no leaks |
| GitHub secret scanning | Repository alerts | **0 alerts** at audit time |

### HTTP end-to-end detail

- Health: `status=healthy`, `version=2.0.0`, `demo_mode=true`
- Job completed all six stages: planning → researching → analyzing → composing → charting → completed
- Report: 6 sections, 20 citations, 2 charts
- Missing token: **403** as expected
- PDF: valid `%PDF`, 115,977 bytes
- Slides: valid HTML, 129,833 bytes
- DOCX: valid ZIP container, 37,432 bytes

Citation counts vary between runs because web search results vary.

### Browser detail

- Demo banner and free-AI activation entry points visible
- Model menu lists 3 free models; switching updates the header
- Settings modal shows version 2.0.0 and demo mode
- Demo chat streams and renders markdown; code-copy restores the original source
- Research completes with 6 sections, 25 citations, and 2 charts
- PDF download: 123,044 bytes
- Mobile sidebar opens, research view renders at 390×844
- No uncaught page errors; one benign Edge lazy-image console message

### Security fixes verified

- `/api/config` and `/api/health` do not expose the API key.
- Research report access without a token returns 403.
- CSP, `X-Frame-Options: DENY`, `nosniff`, and referrer policy are present.
- Invalid chat roles, empty messages, short topics, and unknown depths return 422.
- In live mode, an empty model response and a 401 both raise `LLMError`; no template output is substituted in tests.

## Not verified

| Item | Reason |
| --- | --- |
| Real OpenRouter inference | No API key available in the audit environment. The UI/API live path is covered by mocked tests, but not by a real provider call. |
| Docker build/run | No Docker executable available. The Dockerfile and Compose file were reviewed but not built. |
| WeasyPrint native PDF path | Native Pango libraries are unavailable on this Windows host. The ReportLab fallback PDF was verified end to end. |
| GitHub Actions execution | The workflow is committed on the branch; results must be checked after pushing. |
| Social preview upload | GitHub does not expose a supported API for repository social preview images; manual upload is required. |

## Reproduction notes

```bash
# Backend checks
ruff check backend tests scripts
pytest -q
python scripts/test_pipeline.py

# With a server running in demo mode
python scripts/test_api_e2e.py http://127.0.0.1:8000
```

The test suite forces `OPENROUTER_API_KEY=""` and resets in-memory job state around each test. It does not call a paid provider.
