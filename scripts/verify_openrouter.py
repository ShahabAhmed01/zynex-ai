#!/usr/bin/env python3
"""
Verify OpenRouter API connectivity for Zynex.

Usage (from project root):
  python scripts/verify_openrouter.py

Set OPENROUTER_API_KEY in .env first. Without a key, exits 0 with a skip message.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.config import settings
from backend.services.llm_client import verify_connection


async def main() -> int:
    print(f"Model: {settings.DEFAULT_MODEL}")
    if settings.demo_mode:
        print("SKIP: OPENROUTER_API_KEY not set — app will use demo mode.")
        print("Copy .env.example to .env and add your key from https://openrouter.ai")
        return 0

    result = await verify_connection()
    if result.get("ok"):
        sample = result.get("sample", "")
        print(f"OK: {result['message']}")
        if sample:
            print(f"Sample response: {sample!r}")
        return 0

    print(f"FAIL: {result.get('message', 'unknown error')}")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
