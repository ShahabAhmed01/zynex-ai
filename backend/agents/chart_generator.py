"""
Zynex Chart Generator Agent
Renders chart data into dark-themed matplotlib PNGs and returns base64-encoded images.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Any

import matplotlib

matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

from backend.models.schemas import ChartData

logger = logging.getLogger("zynex.agents.chart_generator")

# ── Brand palette ─────────────────────────────────────────────────────────────
_BG_COLOR = "#0A0A0F"
_SURFACE_COLOR = "#12121A"
_TEXT_COLOR = "#E2E8F0"
_GRID_COLOR = "#1E293B"
_DEFAULT_COLORS = [
    "#3B82F6",  # blue
    "#06B6D4",  # cyan
    "#8B5CF6",  # violet
    "#10B981",  # emerald
    "#F59E0B",  # amber
    "#EF4444",  # red
    "#EC4899",  # pink
    "#6366F1",  # indigo
]


def _apply_dark_theme(fig: plt.Figure, ax: plt.Axes) -> None:
    """Apply the Zynex dark theme to a matplotlib figure."""
    fig.patch.set_facecolor(_BG_COLOR)
    ax.set_facecolor(_SURFACE_COLOR)
    ax.tick_params(colors=_TEXT_COLOR, labelsize=9)
    ax.xaxis.label.set_color(_TEXT_COLOR)
    ax.yaxis.label.set_color(_TEXT_COLOR)
    ax.title.set_color(_TEXT_COLOR)
    for spine in ax.spines.values():
        spine.set_color(_GRID_COLOR)


def _get_colors(chart: ChartData) -> list[str]:
    """Get colours for chart, falling back to defaults."""
    if chart.colors and len(chart.colors) >= len(chart.labels):
        return chart.colors[: len(chart.labels)]
    return (_DEFAULT_COLORS * ((len(chart.labels) // len(_DEFAULT_COLORS)) + 1))[
        : len(chart.labels)
    ]


def _render_bar(chart: ChartData) -> str:
    """Render a bar chart and return base64 PNG."""
    fig, ax = plt.subplots(figsize=(10, 5))
    _apply_dark_theme(fig, ax)

    colors = _get_colors(chart)
    x = np.arange(len(chart.labels))
    bars = ax.bar(x, chart.values, color=colors, width=0.6, edgecolor="none", zorder=3)

    # Value labels on bars
    for bar, val in zip(bars, chart.values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max(chart.values) * 0.02,
            f"{val:.1f}" if val != int(val) else str(int(val)),
            ha="center",
            va="bottom",
            color=_TEXT_COLOR,
            fontsize=8,
            fontweight="bold",
        )

    ax.set_xticks(x)
    ax.set_xticklabels(chart.labels, rotation=30, ha="right", fontsize=8)
    ax.set_title(chart.title, fontsize=13, fontweight="bold", pad=12)
    ax.grid(axis="y", color=_GRID_COLOR, alpha=0.4, zorder=0)
    ax.set_axisbelow(True)

    fig.tight_layout()
    return _fig_to_base64(fig)


def _render_pie(chart: ChartData) -> str:
    """Render a pie chart and return base64 PNG."""
    fig, ax = plt.subplots(figsize=(8, 6))
    fig.patch.set_facecolor(_BG_COLOR)

    colors = _get_colors(chart)

    wedges, texts, autotexts = ax.pie(
        chart.values,
        labels=chart.labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=140,
        pctdistance=0.8,
        wedgeprops={"edgecolor": _BG_COLOR, "linewidth": 2},
    )

    for text in texts:
        text.set_color(_TEXT_COLOR)
        text.set_fontsize(9)
    for at in autotexts:
        at.set_color("white")
        at.set_fontsize(8)
        at.set_fontweight("bold")

    ax.set_title(chart.title, fontsize=13, fontweight="bold", color=_TEXT_COLOR, pad=15)

    fig.tight_layout()
    return _fig_to_base64(fig)


def _render_line(chart: ChartData) -> str:
    """Render a line chart and return base64 PNG."""
    fig, ax = plt.subplots(figsize=(10, 5))
    _apply_dark_theme(fig, ax)

    color = _get_colors(chart)[0]
    x = np.arange(len(chart.labels))

    ax.plot(x, chart.values, color=color, linewidth=2.5, marker="o", markersize=6, zorder=3)
    ax.fill_between(x, chart.values, alpha=0.15, color=color, zorder=2)

    # Data point labels
    for xi, val in zip(x, chart.values):
        ax.annotate(
            f"{val:.1f}" if val != int(val) else str(int(val)),
            (xi, val),
            textcoords="offset points",
            xytext=(0, 10),
            ha="center",
            fontsize=8,
            color=_TEXT_COLOR,
            fontweight="bold",
        )

    ax.set_xticks(x)
    ax.set_xticklabels(chart.labels, rotation=30, ha="right", fontsize=8)
    ax.set_title(chart.title, fontsize=13, fontweight="bold", pad=12)
    ax.grid(color=_GRID_COLOR, alpha=0.4, zorder=0)
    ax.set_axisbelow(True)

    fig.tight_layout()
    return _fig_to_base64(fig)


def _fig_to_base64(fig: plt.Figure) -> str:
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


_RENDERERS = {
    "bar": _render_bar,
    "pie": _render_pie,
    "line": _render_line,
}


async def generate_charts(charts: list[ChartData]) -> dict[str, str]:
    """
    Generate chart images from ChartData objects.

    Returns a dict mapping chart title → base64-encoded PNG.
    """
    logger.info("Generating %d charts", len(charts))
    results: dict[str, str] = {}

    for chart in charts:
        try:
            renderer = _RENDERERS.get(chart.chart_type, _render_bar)
            b64 = renderer(chart)
            results[chart.title] = b64
            logger.info("Chart generated: %s (%s)", chart.title, chart.chart_type)
        except Exception as exc:
            logger.error("Failed to generate chart '%s': %s", chart.title, exc)

    return results
