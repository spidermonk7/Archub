"""Utility helpers that agent-side tools can import.

Current modules:
    plotting: helper functions to persist Matplotlib figures and emit attachment tags.
"""

from .plotting import plot_and_attach  # noqa: F401

__all__ = ["plot_and_attach"]
