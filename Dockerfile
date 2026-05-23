# Zynex — production container (Render, Railway, Fly.io, etc.)
FROM python:3.11-slim-bookworm

# WeasyPrint system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV HOST=0.0.0.0
ENV RELOAD=false
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# PORT is set by most PaaS hosts (Render, Railway, Fly)
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
