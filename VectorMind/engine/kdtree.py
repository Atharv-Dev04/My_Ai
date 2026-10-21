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
        BST-style insertion (iterative).

        Port of C++ ``KDTree::ins`` (main.cpp:112–118). Iterative rather
        than recursive so degenerate trees (e.g. many duplicate points,
        depth == N) do not hit Python's recursion limit. Same placement
        rule: ``<`` goes left, otherwise right.
        """
        new = _KDNode(item=item)
        if node is None:
            return new
        cur = node
        while True:
            axis = depth % self._dims
            if item.emb[axis] < cur.item.emb[axis]:
                if cur.left is None:
                    cur.left = new
                    break
                cur = cur.left
            else:
                if cur.right is None:
                    cur.right = new
                    break
                cur = cur.right
            depth += 1
        return node

    def _knn_search(
        self,
        root: _KDNode,
        q: np.ndarray,
        k: int,
        dist: DistFn,
        heap: list,
    ) -> None:
        """
        KNN traversal with pruning (iterative, explicit stack).

        Port of C++ ``KDTree::knn`` (main.cpp:120–136); visit order and
        pruning decisions are identical to the recursive original.

        ``heap`` emulates C++'s ``priority_queue<pair<float,int>>``
        (max-heap on ``(dist, id)``) as a min-heap of ``(-dist, -id)``:
        the top is the largest distance and, among equal distances, the
        **largest id** — exactly what C++ pops first.

        Pruning: the farther subtree is explored only if the heap is not
        full or ``|axis_diff| < worst``. NOTE (inherited from C++): this
        bound is valid for euclidean and manhattan but NOT for cosine
        distance, so KD-Tree results under ``cosine`` are approximate.
        """
        # stack entries: (node, depth, None)            -> visit node
        #                (node, depth, abs_axis_diff)   -> maybe visit farther
        stack: list = [(root, 0, None)]
        while stack:
            node, depth, gate = stack.pop()
            if node is None:
                continue
            if gate is not None:
                if len(heap) < k or gate < -heap[0][0]:
                    stack.append((node, depth, None))
                continue

            dn = dist(q, node.item.emb)
            if len(heap) < k or dn < -heap[0][0]:
                heapq.heappush(heap, (-dn, -node.item.id))
                if len(heap) > k:
                    heapq.heappop(heap)

            axis = depth % self._dims
            diff = float(q[axis]) - float(node.item.emb[axis])
            closer = node.left if diff < 0 else node.right
            farther = node.right if diff < 0 else node.left

            # farther gate is processed after the closer subtree completes
            stack.append((farther, depth + 1, abs(diff)))
            stack.append((closer, depth + 1, None))

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
        # k <= 0: C++ would call top() on an empty heap (undefined
        # behaviour); Python returns an empty result instead.
        if self._root is None or k <= 0:
            return []
        q = np.asarray(q, dtype=np.float32)
        heap: list[tuple[float, int]] = []
        self._knn_search(self._root, q, k, dist, heap)
        # Convert negated max-heap back to (dist, id), sort ascending
        result = [(-neg_d, -neg_id) for neg_d, neg_id in heap]
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
