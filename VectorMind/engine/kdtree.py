"""
KD-Tree nearest-neighbour search.

Faithful Python port of C++ classes ``KDNode`` / ``KDTree``
(main.cpp:97–159).

Known limitation (same as C++): performance degrades in high dimensions
(curse of dimensionality). Works well for ≤ 20D, converges to brute force
at 768D. Python recursion limit applies; call ``sys.setrecursionlimit``
for datasets > ~500 items in high dimensions.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .metrics import DistFn
from .models import VectorItem


@dataclass
class _KDNode:
    """
    Internal tree node.

    Port of C++ ``struct KDNode`` (main.cpp:97–102).
    """

    item: VectorItem
    left: Optional["_KDNode"] = field(default=None, repr=False)
    right: Optional["_KDNode"] = field(default=None, repr=False)


class KDTree:
    """
    K-dimensional binary tree for exact nearest-neighbour search.

    Port of C++ ``class KDTree`` (main.cpp:104–159).

    Axis cycling: ``axis = depth % dims``  (main.cpp:114).
    KNN uses a max-heap of size k for branch pruning (main.cpp:120–136).

    Public API:
        ``insert(item)``          — Insert a VectorItem.
        ``knn(q, k, dist)``       — k nearest (distance, id) pairs.
        ``rebuild(items)``        — Destroy and rebuild from a list.
    """

    def __init__(self, dims: int) -> None:
        self._root: Optional[_KDNode] = None
        self._dims: int = dims

    # ── PRIVATE ──────────────────────────────────────────────────────────

    def _insert_node(
        self, node: Optional[_KDNode], item: VectorItem, depth: int
    ) -> _KDNode:
        """
        Recursive BST-style insertion.

        Port of C++ ``KDTree::ins`` (main.cpp:112–118).
        """
        if node is None:
            return _KDNode(item=item)
        axis = depth % self._dims
        if item.emb[axis] < node.item.emb[axis]:
            node.left = self._insert_node(node.left, item, depth + 1)
        else:
            node.right = self._insert_node(node.right, item, depth + 1)
        return node

    def _knn_node(
        self,
        node: Optional[_KDNode],
        q: np.ndarray,
        k: int,
        depth: int,
        dist: DistFn,
        heap: list,
    ) -> None:
        """
        Recursive KNN traversal with pruning.

        Port of C++ ``KDTree::knn`` (main.cpp:120–136).

        ``heap`` is a max-heap implemented as a min-heap with negated
        distances: stored as ``(-distance, id)`` so the *worst* (largest)
        distance is always at ``heap[0]``.

        Pruning condition:  skip farther subtree when
            ``|axis_diff| >= worst_in_heap``
        (same ball-within-hyperslab check as C++).
        """
        if node is None:
            return

        dn = dist(q, node.item.emb)

        # Add to heap if there is room or this point improves the current worst
        if len(heap) < k or dn < -heap[0][0]:
            heapq.heappush(heap, (-dn, node.item.id))
            if len(heap) > k:
                heapq.heappop(heap)

        axis = depth % self._dims
        diff = float(q[axis]) - float(node.item.emb[axis])

        closer = node.left if diff < 0 else node.right
        farther = node.right if diff < 0 else node.left

        self._knn_node(closer, q, k, depth + 1, dist, heap)

        # Only explore farther subtree if the axis-split distance could
        # improve the current worst neighbour — mirrors C++ (main.cpp:134)
        if len(heap) < k or abs(diff) < -heap[0][0]:
            self._knn_node(farther, q, k, depth + 1, dist, heap)

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(self, item: VectorItem) -> None:
        """
        Insert a VectorItem into the tree.

        Port of C++ ``KDTree::insert`` (main.cpp:142).
        """
        self._root = self._insert_node(self._root, item, 0)

    def knn(
        self, q: np.ndarray, k: int, dist: DistFn
    ) -> list[tuple[float, int]]:
        """
        Return the ``k`` nearest items sorted by ascending distance.

        Port of C++ ``KDTree::knn`` (main.cpp:144–153).

        Args:
            q:    Query vector (1-D, auto-cast to float32).
            k:    Number of neighbours.
            dist: Distance function.

        Returns:
            List of ``(distance, id)`` pairs, length ``≤ k``.
            Returns ``[]`` for an empty tree.
        """
        if self._root is None:
            return []
        q = np.asarray(q, dtype=np.float32)
        heap: list[tuple[float, int]] = []
        self._knn_node(self._root, q, k, 0, dist, heap)
        # Convert negated max-heap back to (dist, id), sort ascending
        result = [(-neg_d, id_) for neg_d, id_ in heap]
        result.sort()
        return result

    def rebuild(self, items: list[VectorItem]) -> None:
        """
        Destroy the current tree and rebuild from ``items``.

        Port of C++ ``KDTree::rebuild`` (main.cpp:155–158).
        Used after deletions (same pattern as VectorDB::remove).
        """
        self._root = None
        for item in items:
            self.insert(item)
