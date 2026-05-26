"""
Zynex Configuration Module
Loads environment variables and provides a typed settings object.
Supports runtime reload for dynamic key provisioning.
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
    HOST: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
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
                "\nINFO: OPENROUTER_API_KEY not set — Zynex is running in DEMO MODE."
                "\n   Users can activate free AI directly from the web interface.\n"
            )
        else:
            masked = self.OPENROUTER_API_KEY[:6] + "..." + self.OPENROUTER_API_KEY[-4:]
            print(f"\nOpenRouter API key detected: {masked}")
            print(f"   Default model: {self.DEFAULT_MODEL}\n")


# ── Singleton with reload support ────────────────────────────────────────────

settings = Settings()
settings.validate()


def get_settings() -> Settings:
    """Return the current settings singleton."""
    return settings


def reload_settings() -> Settings:
    """Re-read .env and rebuild the settings singleton."""
    global settings

    # Clear cached env vars so dotenv re-reads the file
    for key in ("OPENROUTER_API_KEY", "DEFAULT_MODEL", "HOST", "PORT"):
        os.environ.pop(key, None)

    load_dotenv(_project_root / ".env", override=True)

    settings = Settings()
    settings.validate()

    # Reset the LLM client singleton so it picks up the new key
    try:
        from backend.services import llm_client
        llm_client._client = None
    except ImportError:
        pass

    return settings
