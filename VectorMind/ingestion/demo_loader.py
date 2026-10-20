"""
Demo data loader — 20 canonical 16-D vectors seeded from the C++ original.

Faithful Python port of C++ function ``loadDemo`` (main.cpp:717–760).

The exact float values are taken verbatim from the C++ source and must not
be changed; they are part of the algorithmic reference dataset used in tests.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import numpy as np

from engine.metrics import cosine
from engine.models import VectorItem
from engine.vector_db import VectorDB

# ---------------------------------------------------------------------------
# The 20 canonical demo vectors from main.cpp:720–759.
# Each tuple is (metadata, category, 16-D embedding).
# Dims 0–3: CS | Dims 4–7: Math | Dims 8–11: Food | Dims 12–15: Sports
# ---------------------------------------------------------------------------

_DEMO_ITEMS: list[tuple[str, str, list[float]]] = [
    # ── CS / Algorithms ────────────────────────────────────────────────
    (
        "Linked List: nodes connected by pointers",
        "cs",
        [0.90, 0.85, 0.72, 0.68, 0.12, 0.08, 0.15, 0.10,
         0.05, 0.08, 0.06, 0.09, 0.07, 0.11, 0.08, 0.06],
    ),
    (
        "Binary Search Tree: O(log n) search and insert",
        "cs",
        [0.88, 0.82, 0.78, 0.74, 0.15, 0.10, 0.08, 0.12,
         0.06, 0.07, 0.08, 0.05, 0.09, 0.06, 0.07, 0.10],
    ),
    (
        "Dynamic Programming: memoization overlapping subproblems",
        "cs",
        [0.82, 0.76, 0.88, 0.80, 0.20, 0.18, 0.12, 0.09,
         0.07, 0.06, 0.08, 0.07, 0.08, 0.09, 0.06, 0.07],
    ),
    (
        "Graph BFS and DFS: breadth and depth first traversal",
        "cs",
        [0.85, 0.80, 0.75, 0.82, 0.18, 0.14, 0.10, 0.08,
         0.06, 0.09, 0.07, 0.06, 0.10, 0.08, 0.09, 0.07],
    ),
    (
        "Hash Table: O(1) lookup with collision chaining",
        "cs",
        [0.87, 0.78, 0.70, 0.76, 0.13, 0.11, 0.09, 0.14,
         0.08, 0.07, 0.06, 0.08, 0.07, 0.10, 0.08, 0.09],
    ),
    # ── Mathematics ────────────────────────────────────────────────────
    (
        "Calculus: derivatives integrals and limits",
        "math",
        [0.12, 0.15, 0.18, 0.10, 0.91, 0.86, 0.78, 0.72,
         0.08, 0.06, 0.07, 0.09, 0.07, 0.08, 0.06, 0.10],
    ),
    (
        "Linear Algebra: matrices eigenvalues eigenvectors",
        "math",
        [0.20, 0.18, 0.15, 0.12, 0.88, 0.90, 0.82, 0.76,
         0.09, 0.07, 0.08, 0.06, 0.10, 0.07, 0.08, 0.09],
    ),
    (
        "Probability: distributions random variables Bayes theorem",
        "math",
        [0.15, 0.12, 0.20, 0.18, 0.84, 0.80, 0.88, 0.82,
         0.07, 0.08, 0.06, 0.10, 0.09, 0.06, 0.09, 0.08],
    ),
    (
        "Number Theory: primes modular arithmetic RSA cryptography",
        "math",
        [0.22, 0.16, 0.14, 0.20, 0.80, 0.85, 0.76, 0.90,
         0.08, 0.09, 0.07, 0.06, 0.08, 0.10, 0.07, 0.06],
    ),
    (
        "Combinatorics: permutations combinations generating functions",
        "math",
        [0.18, 0.20, 0.16, 0.14, 0.86, 0.78, 0.84, 0.80,
         0.06, 0.07, 0.09, 0.08, 0.06, 0.09, 0.10, 0.07],
    ),
    # ── Food & Cooking ──────────────────────────────────────────────────
    (
        "Neapolitan Pizza: wood-fired dough San Marzano tomatoes",
        "food",
        [0.08, 0.06, 0.09, 0.07, 0.07, 0.08, 0.06, 0.09,
         0.90, 0.86, 0.78, 0.72, 0.08, 0.06, 0.09, 0.07],
    ),
    (
        "Sushi: vinegared rice raw fish and nori rolls",
        "food",
        [0.06, 0.08, 0.07, 0.09, 0.09, 0.06, 0.08, 0.07,
         0.86, 0.90, 0.82, 0.76, 0.07, 0.09, 0.06, 0.08],
    ),
    (
        "Ramen: noodle soup with chashu pork and soft-boiled eggs",
        "food",
        [0.09, 0.07, 0.06, 0.08, 0.08, 0.09, 0.07, 0.06,
         0.82, 0.78, 0.90, 0.84, 0.09, 0.07, 0.08, 0.06],
    ),
    (
        "Tacos: corn tortillas with carnitas salsa and cilantro",
        "food",
        [0.07, 0.09, 0.08, 0.06, 0.06, 0.07, 0.09, 0.08,
         0.78, 0.82, 0.86, 0.90, 0.06, 0.08, 0.07, 0.09],
    ),
    (
        "Croissant: laminated pastry with buttery flaky layers",
        "food",
        [0.06, 0.07, 0.10, 0.09, 0.10, 0.06, 0.07, 0.10,
         0.85, 0.80, 0.76, 0.82, 0.09, 0.07, 0.10, 0.06],
    ),
    # ── Sports & Games ──────────────────────────────────────────────────
    (
        "Basketball: fast-paced shooting dribbling slam dunks",
        "sports",
        [0.09, 0.07, 0.08, 0.10, 0.08, 0.09, 0.07, 0.06,
         0.08, 0.07, 0.09, 0.06, 0.91, 0.85, 0.78, 0.72],
    ),
    (
        "Football: tackles touchdowns field goals and strategy",
        "sports",
        [0.07, 0.09, 0.06, 0.08, 0.09, 0.07, 0.10, 0.08,
         0.07, 0.09, 0.08, 0.07, 0.87, 0.89, 0.82, 0.76],
    ),
    (
        "Tennis: racket volleys groundstrokes and Wimbledon serves",
        "sports",
        [0.08, 0.06, 0.09, 0.07, 0.07, 0.08, 0.06, 0.09,
         0.09, 0.06, 0.07, 0.08, 0.83, 0.80, 0.88, 0.82],
    ),
    (
        "Chess: openings endgames tactics strategic board game",
        "sports",
        [0.25, 0.20, 0.22, 0.18, 0.22, 0.18, 0.20, 0.15,
         0.06, 0.08, 0.07, 0.09, 0.80, 0.84, 0.78, 0.90],
    ),
    (
        "Swimming: butterfly freestyle backstroke Olympic competition",
        "sports",
        [0.06, 0.08, 0.07, 0.09, 0.08, 0.06, 0.09, 0.07,
         0.10, 0.08, 0.06, 0.07, 0.85, 0.82, 0.86, 0.80],
    ),
]


def load_demo(db: VectorDB) -> None:
    """
    Populate ``db`` with the 20 canonical demo vectors.

    Port of C++ ``loadDemo`` (main.cpp:717–760).
    Always uses cosine distance for HNSW construction (same as C++).
    """
    for meta, cat, raw_emb in _DEMO_ITEMS:
        emb = np.array(raw_emb, dtype=np.float32)
        db.insert(meta, cat, emb, cosine)


def demo_items_raw() -> list[tuple[str, str, np.ndarray]]:
    """
    Return the 20 demo items as (metadata, category, emb) tuples.
    Useful for building test fixtures without a VectorDB instance.
    """
    return [
        (meta, cat, np.array(raw_emb, dtype=np.float32))
        for meta, cat, raw_emb in _DEMO_ITEMS
    ]
