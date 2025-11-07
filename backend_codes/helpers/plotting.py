"""
Plot helpers that make it easy for agents to persist Matplotlib figures and
emit attachment tags understood by the WorkflowChat renderer.

Example:
    import matplotlib.pyplot as plt
    from backend_codes.helpers.plotting import plot_and_attach

    plt.plot(range(10), [v**2 for v in range(10)])
    plot_and_attach(display_name="Quadratic Curve")
"""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Any, Optional


BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_TMP_DIR = BACKEND_DIR / "data" / "tmp_artifacts"
TMP_ROOT = Path(os.environ.get("AGENT_ARTIFACT_TMP", DEFAULT_TMP_DIR)).resolve()
TMP_ROOT.mkdir(parents=True, exist_ok=True)

_SAFE_CHARS = re.compile(r"[^a-zA-Z0-9._-]+")


def _slugify(value: Optional[str], fallback: str) -> str:
    raw = (value or "").strip()
    cleaned = _SAFE_CHARS.sub("_", raw)
    return cleaned or fallback


def plot_and_attach(
    fig: Optional[Any] = None,
    *,
    display_name: Optional[str] = None,
    filename: Optional[str] = None,
    suffix: str = ".png",
    dpi: int = 220,
    bbox_inches: str | None = "tight",
    close: bool = False,
    echo: bool = True,
) -> str:
    """
    Save the provided Matplotlib figure (or the current active figure) to a temp
    file and emit an artifact tag string understood by the runner.

    Args:
        fig: Matplotlib figure to save. Defaults to the current figure.
        display_name: Friendly name shown in the chat bubble attachment.
        filename: Base filename (excluding suffix). Defaults to slugified display_name.
        suffix: File extension, default ".png".
        dpi: Resolution passed to `savefig`.
        bbox_inches: Bounding box option forwarded to `savefig`.
        close: Whether to close the figure after saving.
        echo: When True, print the tag so it appears in the agent's output.

    Returns:
        The artifact tag string (e.g., '[[artifact:/abs/path.png|Plot|image/png]]').
    """
    try:
        import matplotlib.pyplot as plt  # type: ignore
    except ImportError as exc:
        raise RuntimeError("matplotlib is required for plot_and_attach.") from exc

    target = fig or plt.gcf()
    if target is None:
        raise RuntimeError("plot_and_attach requires an active Matplotlib figure.")

    safe_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    mime = "image/png" if safe_suffix.lower() in (".png", ".apng") else f"image/{safe_suffix.lstrip('.')}"
    base_label = display_name or filename or "figure"
    base_name = _slugify(filename or base_label.replace(" ", "_"), f"plot_{uuid.uuid4().hex[:8]}")
    unique_id = uuid.uuid4().hex[:6]
    dest = TMP_ROOT / f"{base_name}-{unique_id}{safe_suffix}"

    dest.parent.mkdir(parents=True, exist_ok=True)
    target.savefig(dest, dpi=dpi, bbox_inches=bbox_inches)
    if close:
        plt.close(target)

    path_str = dest.resolve().as_posix()
    label = base_label or "figure"
    tag = f"[[artifact:{path_str}|{label}|{mime}]]"
    if echo:
        print(tag)
    return tag


__all__ = ["plot_and_attach"]
