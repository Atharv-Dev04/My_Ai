"""
Brute-force nearest-neighbour search.

Faithful Python port of C++ class ``BruteForce`` (main.cpp:70–91).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import numpy as np

from .metrics import DistFn, get_batch_fn
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
        # Cached (n, dims) matrix for vectorised knn; invalidated on mutation.
        self._mat: np.ndarray | None = None
        self._ids: np.ndarray = np.empty(0, dtype=np.int64)

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(self, item: VectorItem) -> None:
        """
        Append a VectorItem to the internal list.

        Port of C++ ``BruteForce::insert`` (main.cpp:74).
        """
        self.items.append(item)
        self._mat = None

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
        batch = get_batch_fn(dist)
        if batch is None:
            pairs: list[tuple[float, int]] = [
                (dist(q, item.emb), item.id) for item in self.items
            ]
            # Sort by (distance, id) — matches C++ pair<float,int> sort
            pairs.sort()
            return pairs[:k]

        mat, ids = self._matrix()
        d = batch(q, mat)
        # lexsort: last key is primary -> sort by (distance, id) ascending,
        # identical ordering to sorting C++ pair<float,int>.
        order = np.lexsort((ids, d))[: max(k, 0)]
        return list(zip(d[order].tolist(), ids[order].tolist()))

    def _matrix(self) -> tuple[np.ndarray, np.ndarray]:
        """Contiguous float32 matrix + id array, cached until a mutation."""
        if self._mat is None or len(self._ids) != len(self.items):
            self._mat = np.stack(
                [np.asarray(v.emb, dtype=np.float32) for v in self.items]
            )
            self._ids = np.fromiter(
                (v.id for v in self.items), dtype=np.int64, count=len(self.items)
            )
        return self._mat, self._ids

    def remove(self, id_: int) -> None:
        """
        Remove all items whose ``id`` equals ``id_``.

        Port of C++ ``BruteForce::remove`` (main.cpp:87–90).
        """
        self.items = [v for v in self.items if v.id != id_]
        self._mat = None
