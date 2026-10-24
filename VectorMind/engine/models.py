"""
Data models for the VectorMind engine.

Faithful Python equivalents of C++ structs in main.cpp.
    VectorItem  → struct VectorItem  (main.cpp:26–31)
    DocItem     → struct DocItem     (main.cpp:644–649)

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class VectorItem:
    """
    Equivalent of C++ ``struct VectorItem`` (main.cpp:26–31).

    Fields mirror the original exactly:
        id       : int          — unique identifier
        metadata : str          — freeform label
        category : str          — semantic category (e.g. "cs", "math")
        emb      : np.ndarray   — float32 embedding vector
    """

    id: int
    metadata: str
    category: str
    emb: np.ndarray


@dataclass
class DocItem:
    """
    Equivalent of C++ ``struct DocItem`` (main.cpp:644–649), with optional
    source pagination and chunk metadata.

    Fields:
        id          : int
        title       : str
        text        : str          — chunk content
        emb         : np.ndarray   — float32 embedding vector
        page_number : int | None   — source page number when available (e.g. PDF)
        chunk_index : int          — 0-indexed position within source document
    """

    id: int
    title: str
    text: str
    emb: np.ndarray
    page_number: int | None = None
    chunk_index: int = 0
