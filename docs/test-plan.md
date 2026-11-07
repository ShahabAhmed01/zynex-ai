# Test Plan

This plan covers the checks used for the current 2.x codebase. It is intentionally focused on behavior that can be reproduced from a clean checkout.

## Automated checks

### 1. Lint

```bash
ruff check backend tests scripts
```

Covers imports, unused names, modernization, and configured style rules. Configuration lives in `pyproject.toml`; the frontend is excluded because it has no build toolchain.

### 2. Unit and API tests

```bash
pytest -q
```

The suite forces demo mode, sets an empty `OPENROUTER_API_KEY`, and resets the in-memory research stores around every test. It covers:

- health and config contracts, including secret non-disclosure,
- security headers,
- research request validation and token enforcement,
- chat payload validation and the labelled demo stream,
- OAuth URL validation and blank-code rejection,
- report schema bounds and defaults,
- PDF fallback header/size, DOCX container, and standalone slide HTML,
- demo templates, real-mode content, empty responses, provider errors, and demo-marker stripping.

### 3. Research pipeline

```bash
python scripts/test_pipeline.py
```

Runs all six agent stages against live search in demo mode. It asserts that a plan exists, that sources are collected, that the report has sections and citations, and that charts are produced. Search is third-party and may be rate-limited; a network failure is reported rather than hidden.

### 4. HTTP end-to-end

```bash
python run.py
# in another terminal
python scripts/test_api_e2e.py http://127.0.0.1:8000
```

Exercises the running service: health, job creation, SSE progress, report retrieval, rejection of a missing token, and PDF/DOCX/slides downloads. File signatures are checked (`%PDF`, ZIP `PK`, HTML).

### 5. Browser flow

A Playwright check against Microsoft Edge covers:

- initial config, model menu, settings, and activation entry points,
- demo chat streaming and code-copy round-trip,
- research form, progress, report rendering, history, and PDF download,
- mobile sidebar toggle and research navigation,
- console errors and uncaught page errors.

The script is environment-specific and not committed; the behavior it checks is also represented in the API tests where practical.

## Manual checks

| Area | Check |
| --- | --- |
| First run | `python run.py` without `.env`; demo banner visible, app usable |
| Activation | OAuth popup returns to the app and the banner disappears after a valid key |
| Live chat | A configured key produces real model output; an invalid key shows an error |
| Research | All three depths complete; report has citations and at least one chart |
| Exports | PDF opens, DOCX opens, slides navigate with arrow keys |
| Mobile | Sidebar opens and closes; research form and report remain usable at 390px |
| Security | `/api/config` and `/api/health` contain no key; report URL without token returns 403 |

## Known environmental limits

- Real OpenRouter inference requires a key and was not exercised in the launch audit environment.
- Docker builds require a Docker daemon; CI does not build the image.
- WeasyPrint requires native Pango/Cairo libraries. On Windows without them, the ReportLab fallback is the active PDF path.
- DuckDuckGo availability varies by network and rate limit. A failed search should fail the job, never fabricate sources.
