# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS build

WORKDIR /app

# Install build-time system deps for WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into an isolated prefix for easy copying
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS runtime

# Runtime-only system deps (smaller set than build stage)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r zynex && useradd -r -g zynex -d /app -s /sbin/nologin zynex

WORKDIR /app

# Copy installed Python packages from build stage
COPY --from=build /install /usr/local

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY run.py .

# Set ownership
RUN chown -R zynex:zynex /app

# Switch to non-root user
USER zynex

# Environment defaults
ENV HOST=0.0.0.0 \
    PORT=8000 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Health check using the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]

# PORT is set by most PaaS hosts (Render, Railway, Fly)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

# ── Stage 3: Optimized (with static asset compression) ────────────────────
FROM runtime AS optimized

USER root

# Install compression tools and compress static assets
RUN apt-get update && apt-get install -y --no-install-recommends gzip \
    && rm -rf /var/lib/apt/lists/* \
    && find /app/frontend -name "*.css" -exec gzip -9 -k {} \; \
    && find /app/frontend -name "*.js" -exec gzip -9 -k {} \; \
    && find /app/frontend -name "*.html" -exec gzip -9 -k {} \; \
    && chown -R zynex:zynex /app

USER zynex
