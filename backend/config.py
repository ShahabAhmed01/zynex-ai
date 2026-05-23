"""
Zynex Configuration Module
Loads environment variables and provides a typed settings object.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    OPENROUTER_API_KEY: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "")
    )
    DEFAULT_MODEL: str = field(
        default_factory=lambda: os.getenv(
            "DEFAULT_MODEL", "google/gemini-2.0-flash-001"
        )
    )
    HOST: str = field(default_factory=lambda: os.getenv("HOST", "127.0.0.1"))
    PORT: int = field(
        default_factory=lambda: int(os.getenv("PORT", "8000"))
    )
    PROJECT_ROOT: Path = field(default_factory=lambda: _project_root)
    TEMPLATES_DIR: Path = field(
        default_factory=lambda: Path(__file__).resolve().parent / "templates"
    )

    # ── Derived ──────────────────────────────────────────────────────────
    @property
    def has_api_key(self) -> bool:
        """Return True when a real OpenRouter key is configured."""
        return bool(self.OPENROUTER_API_KEY and self.OPENROUTER_API_KEY.strip())

    @property
    def demo_mode(self) -> bool:
        """Return True when running without an API key (demo mode)."""
        return not self.has_api_key

    def validate(self) -> None:
        """Run startup validation – prints warnings but never crashes."""
        if self.demo_mode:
            print(
            "\nWARNING: OPENROUTER_API_KEY not set - Zynex is running in DEMO MODE.\n"
            "   Set the key in a .env file or environment variable for real AI responses.\n"
        )
        else:
            masked = self.OPENROUTER_API_KEY[:6] + "..." + self.OPENROUTER_API_KEY[-4:]
            print(f"\nOpenRouter API key detected: {masked}")
            print(f"   Default model: {self.DEFAULT_MODEL}\n")


# Singleton
settings = Settings()
settings.validate()
