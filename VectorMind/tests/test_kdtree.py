"""
Tests for KD-Tree KNN (engine/kdtree.py).

Agreement with BruteForce is the primary correctness criterion
(since neither the C++ binary nor a ground-truth dataset can be
compared bit-for-bit due to Deviation D1).
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.brute_force import BruteForce
from engine.kdtree import KDTree
from engine.metrics import cosine, euclidean, manhattan
from engine.models import VectorItem


def _make_item(id_: int, v: list[float], cat: str = "t") -> VectorItem:
    return VectorItem(id_, f"item-{id_}", cat, np.array(v, dtype=np.float32))


def _ids(results) -> list[int]:
    return [id_ for _, id_ in results]


class TestKDTreeEmpty:
    def test_knn_empty_tree(self):
        kdt = KDTree(dims=2)
        assert kdt.knn(np.array([1.0, 0.0], dtype=np.float32), 5, euclidean) == []

    def test_rebuild_empty_tree(self):
        kdt = KDTree(dims=2)
        kdt.rebuild([])
        assert kdt.knn(np.array([0.0, 0.0], dtype=np.float32), 3, euclidean) == []


class TestKDTreeInsertAndSearch:
    def test_single_item_returned(self):
        kdt = KDTree(dims=2)
        kdt.insert(_make_item(1, [1.0, 0.0]))
        results = kdt.knn(np.array([0.5, 0.5], dtype=np.float32), 5, euclidean)
        assert _ids(results) == [1]

    def test_k_limits_results(self):
        kdt = KDTree(dims=2)
        for i in range(5):
            kdt.insert(_make_item(i + 1, [float(i), 0.0]))
        results = kdt.knn(np.array([0.0, 0.0], dtype=np.float32), 2, euclidean)
        assert len(results) == 2

    def test_k_larger_than_size_returns_all(self):
        kdt = KDTree(dims=2)
        for i in range(3):
            kdt.insert(_make_item(i + 1, [float(i), 0.0]))
        results = kdt.knn(np.array([0.0, 0.0], dtype=np.float32), 10, euclidean)
        assert len(results) == 3

    def test_results_sorted_ascending(self):
        kdt = KDTree(dims=2)
        for i in range(5):
            kdt.insert(_make_item(i + 1, [float(i), 0.0]))
        results = kdt.knn(np.array([2.5, 0.0], dtype=np.float32), 5, euclidean)
        dists = [d for d, _ in results]
        assert dists == sorted(dists)


class TestKDTreeAgreementWithBruteForce:
    """KD-Tree must return identical results to BruteForce for exact search."""

    def _compare(self, items, query, k, dist_fn):
        kdt = KDTree(dims=len(query))
        bf = BruteForce()
        for item in items:
            kdt.insert(item)
            bf.insert(item)
        q = np.asarray(query, dtype=np.float32)
        kdt_res = kdt.knn(q, k, dist_fn)
        bf_res = bf.knn(q, k, dist_fn)
        return kdt_res, bf_res

    def test_2d_euclidean_top3(self):
        items = [
            _make_item(1, [1.0, 0.0]),
            _make_item(2, [0.0, 1.0]),
            _make_item(3, [-1.0, 0.0]),
            _make_item(4, [0.5, 0.5]),
            _make_item(5, [0.1, 0.1]),
        ]
        kdt_res, bf_res = self._compare(items, [0.6, 0.2], 3, euclidean)
        assert _ids(kdt_res) == _ids(bf_res)

    def test_2d_cosine_top2(self):
        items = [
            _make_item(1, [1.0, 0.01]),
            _make_item(2, [0.0, 1.0]),
            _make_item(3, [-1.0, 0.0]),
        ]
        kdt_res, bf_res = self._compare(items, [1.0, 0.0], 2, cosine)
        assert _ids(kdt_res) == _ids(bf_res)

    def test_2d_manhattan_top1(self):
        items = [
            _make_item(1, [0.0, 0.0]),
            _make_item(2, [10.0, 0.0]),
            _make_item(3, [0.0, 10.0]),
        ]
        kdt_res, bf_res = self._compare(items, [1.0, 0.5], 1, manhattan)
        assert _ids(kdt_res) == _ids(bf_res)

    def test_16d_demo_data_cosine(self, demo_items):
        """KDTree and BruteForce agree for all 20 demo items on 16-D cosine."""
        items = [
            VectorItem(i + 1, meta, cat, emb)
            for i, (meta, cat, emb) in enumerate(demo_items)
        ]

        # Use a strong CS-category query
        q = np.array([0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
                      0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32)

        kdt = KDTree(dims=16)
        bf = BruteForce()
        for item in items:
            kdt.insert(item)
            bf.insert(item)

        kdt_res = kdt.knn(q, 5, cosine)
        bf_res = bf.knn(q, 5, cosine)
        assert _ids(kdt_res) == _ids(bf_res), (
            f"KDTree and BruteForce disagree:\nKDT: {kdt_res}\nBF: {bf_res}"
        )

    def test_16d_demo_data_euclidean(self, demo_items):
        """KDTree and BruteForce agree on a math-region query (Euclidean)."""
        items = [
            VectorItem(i + 1, meta, cat, emb)
            for i, (meta, cat, emb) in enumerate(demo_items)
        ]
        # Strong Math query (high dims 4-7)
        q = np.array([0.05,0.05,0.05,0.05,0.90,0.85,0.80,0.75,
                      0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32)

        kdt = KDTree(dims=16)
        bf = BruteForce()
        for item in items:
            kdt.insert(item)
            bf.insert(item)

        kdt_res = kdt.knn(q, 5, euclidean)
        bf_res = bf.knn(q, 5, euclidean)
        assert _ids(kdt_res) == _ids(bf_res)


class TestKDTreeRebuild:
    def test_rebuild_after_remove_agrees_with_bf(self):
        """After removing an item and rebuilding, search excludes deleted item."""
        items = [_make_item(i + 1, [float(i), 0.0]) for i in range(5)]
        kdt = KDTree(dims=2)
        for item in items:
            kdt.insert(item)

        # Simulate VectorDB's remove pattern: rebuild without item 1
        remaining = [it for it in items if it.id != 1]
        kdt.rebuild(remaining)

        q = np.array([0.0, 0.0], dtype=np.float32)
        results = kdt.knn(q, 5, euclidean)
        assert 1 not in _ids(results)
        assert len(results) == 4

    def test_rebuild_empty_leaves_no_results(self):
        kdt = KDTree(dims=2)
        kdt.insert(_make_item(1, [1.0, 0.0]))
        kdt.rebuild([])
        assert kdt.knn(np.array([0.0, 0.0], dtype=np.float32), 3, euclidean) == []
