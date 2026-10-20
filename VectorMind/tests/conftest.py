"""
Shared pytest fixtures for all VectorMind engine tests.

Provides:
    demo_items     — The 20 canonical (meta, cat, emb) tuples from C++ loadDemo.
    empty_vdb      — A fresh VectorDB(dims=16) with no items.
    loaded_vdb     — A VectorDB pre-populated with all 20 demo items.
    tiny_items     — 5 simple 2-D items for deterministic unit tests.
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.metrics import cosine
from engine.models import VectorItem
from engine.vector_db import VectorDB
from ingestion.demo_loader import demo_items_raw

DIMS = 16   # demo vector dimensionality


@pytest.fixture(scope="session")
def demo_items() -> list[tuple[str, str, np.ndarray]]:
    """Return the 20 canonical demo (meta, cat, emb) tuples."""
    return demo_items_raw()


@pytest.fixture()
def empty_vdb() -> VectorDB:
    """Fresh VectorDB with no items."""
    return VectorDB(dims=DIMS)


@pytest.fixture()
def loaded_vdb(demo_items) -> VectorDB:
    """VectorDB pre-populated with all 20 demo vectors (cosine distance)."""
    db = VectorDB(dims=DIMS)
    for meta, cat, emb in demo_items:
        db.insert(meta, cat, emb, cosine)
    return db


@pytest.fixture()
def tiny_items() -> list[VectorItem]:
    """
    5 simple 2-D items for deterministic unit tests.

    Layout (2-D space):
        id=1  [1.0, 0.0]   cat=a
        id=2  [0.9, 0.1]   cat=a
        id=3  [0.0, 1.0]   cat=b
        id=4  [-1.0, 0.0]  cat=c
        id=5  [0.5, 0.5]   cat=a
    """
    return [
        VectorItem(1, "near x-axis 1", "a", np.array([1.0, 0.0], dtype=np.float32)),
        VectorItem(2, "near x-axis 2", "a", np.array([0.9, 0.1], dtype=np.float32)),
        VectorItem(3, "y-axis",         "b", np.array([0.0, 1.0], dtype=np.float32)),
        VectorItem(4, "neg x-axis",     "c", np.array([-1.0, 0.0], dtype=np.float32)),
        VectorItem(5, "diagonal",       "a", np.array([0.5, 0.5], dtype=np.float32)),
    ]
