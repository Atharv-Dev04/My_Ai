"""
Brute-force nearest-neighbour search.

Faithful Python port of C++ class ``BruteForce`` (main.cpp:70–91).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import numpy as np

from .metrics import DistFn
from .models import VectorItem


class BruteForce:
    """
    O(N·d) exhaustive linear scan for exact nearest neighbours.

    Port of C++ ``class BruteForce`` (main.cpp:70–91).

    All three public methods preserve exact C++ semantics:

    * ``insert``  — O(1) append.
    * ``knn``     — Compute all distances, sort ascending, return top-k.
    * ``remove``  — Linear filter; removes **all** items with matching id.

    Tie-breaking: results are sorted by ``(distance, id)`` ascending,
    matching C++ ``std::sort`` on ``std::pair<float, int>``.
    """

    def __init__(self) -> None:
        self.items: list[VectorItem] = []

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(self, item: VectorItem) -> None:
        """
        Append a VectorItem to the internal list.

        Port of C++ ``BruteForce::insert`` (main.cpp:74).
        """
        self.items.append(item)

    def knn(
        self, q: np.ndarray, k: int, dist: DistFn
    ) -> list[tuple[float, int]]:
        """
        Return the ``k`` nearest items sorted by ascending distance.

        Port of C++ ``BruteForce::knn`` (main.cpp:76–85).

        Args:
            q:    Query vector (1-D, auto-cast to float32).
            k:    Number of neighbours to return.
            dist: Distance function.

        Returns:
            List of ``(distance, id)`` pairs, length ``≤ k``.
            Returns ``[]`` when the store is empty.
        """
        if not self.items:
            return []

        q = np.asarray(q, dtype=np.float32)
        pairs: list[tuple[float, int]] = [
            (dist(q, item.emb), item.id) for item in self.items
        ]
        # Sort by (distance, id) — matches C++ pair<float,int> sort
        pairs.sort()
        return pairs[:k]

    def remove(self, id_: int) -> None:
        """
        Remove all items whose ``id`` equals ``id_``.

        Port of C++ ``BruteForce::remove`` (main.cpp:87–90).
        """
        self.items = [v for v in self.items if v.id != id_]
