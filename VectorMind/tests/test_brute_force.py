"""
Tests for BruteForce KNN (engine/brute_force.py).
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.brute_force import BruteForce
from engine.metrics import cosine, euclidean, manhattan
from engine.models import VectorItem


def _make_item(id_: int, v: list[float], cat: str = "test") -> VectorItem:
    return VectorItem(id_, f"item-{id_}", cat, np.array(v, dtype=np.float32))


class TestBruteForceInsertAndSize:
    def test_starts_empty(self):
        bf = BruteForce()
        assert len(bf.items) == 0

    def test_insert_increases_count(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.0, 1.0]))
        assert len(bf.items) == 2

    def test_insert_preserves_embedding(self):
        bf = BruteForce()
        emb = [0.1, 0.2, 0.3]
        bf.insert(_make_item(7, emb))
        np.testing.assert_array_almost_equal(bf.items[0].emb, emb)


class TestBruteForceKNN:
    def test_empty_returns_empty(self):
        bf = BruteForce()
        result = bf.knn(np.array([1.0, 0.0], dtype=np.float32), 5, euclidean)
        assert result == []

    def test_knn_returns_sorted_ascending(self):
        """Results must be sorted by distance ascending."""
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.5, 0.5]))
        bf.insert(_make_item(3, [0.0, 1.0]))
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = bf.knn(q, 3, euclidean)
        dists = [d for d, _ in results]
        assert dists == sorted(dists)

    def test_knn_top1_is_nearest(self):
        """Top-1 result is the geometrically nearest item."""
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.0, 1.0]))
        bf.insert(_make_item(3, [-1.0, 0.0]))
        q = np.array([0.9, 0.0], dtype=np.float32)
        results = bf.knn(q, 1, euclidean)
        assert len(results) == 1
        assert results[0][1] == 1   # nearest is item 1

    def test_knn_k_larger_than_size(self):
        """When k > len(items), return all items."""
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.0, 1.0]))
        results = bf.knn(np.array([0.5, 0.5], dtype=np.float32), 10, euclidean)
        assert len(results) == 2

    def test_knn_k_equals_1(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.0, 1.0]))
        results = bf.knn(np.array([1.0, 0.0], dtype=np.float32), 1, euclidean)
        assert len(results) == 1

    def test_knn_exact_distance(self):
        """euclidean([3,4], [0,0]) = 5."""
        bf = BruteForce()
        bf.insert(_make_item(1, [0.0, 0.0]))
        q = np.array([3.0, 4.0], dtype=np.float32)
        results = bf.knn(q, 1, euclidean)
        assert results[0][0] == pytest.approx(5.0, rel=1e-5)

    def test_knn_with_cosine(self):
        """Top-1 cosine result for [1,0] should be the most aligned vector."""
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.01]))   # almost [1,0]
        bf.insert(_make_item(2, [0.0, 1.0]))    # orthogonal
        bf.insert(_make_item(3, [-1.0, 0.0]))   # opposite
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = bf.knn(q, 3, cosine)
        assert results[0][1] == 1   # item 1 is closest in cosine

    def test_knn_with_manhattan(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [0.0, 0.0]))
        bf.insert(_make_item(2, [10.0, 0.0]))
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = bf.knn(q, 2, manhattan)
        assert results[0][1] == 1   # id=1 is L1-closer to [1,0]

    def test_knn_zero_distance_self(self):
        """Distance from a point to itself is 0."""
        bf = BruteForce()
        emb = [0.5, 0.3, 0.2]
        bf.insert(_make_item(1, emb))
        results = bf.knn(np.array(emb, dtype=np.float32), 1, euclidean)
        assert results[0][0] == pytest.approx(0.0, abs=1e-6)

    def test_tie_broken_by_id(self):
        """When two items are equidistant, lower id comes first (pair sort)."""
        bf = BruteForce()
        bf.insert(_make_item(3, [1.0, 0.0]))
        bf.insert(_make_item(1, [-1.0, 0.0]))
        # query is [0,0]; both are at euclidean distance 1
        q = np.array([0.0, 0.0], dtype=np.float32)
        results = bf.knn(q, 2, euclidean)
        assert results[0][0] == pytest.approx(1.0, rel=1e-5)
        assert results[0][1] == 1   # id=1 < id=3, so it comes first


class TestBruteForceRemove:
    def test_remove_existing(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.0, 1.0]))
        bf.remove(1)
        assert all(v.id != 1 for v in bf.items)
        assert len(bf.items) == 1

    def test_remove_nonexistent_is_noop(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.remove(999)
        assert len(bf.items) == 1

    def test_remove_all_then_knn_empty(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.remove(1)
        assert bf.knn(np.array([1.0, 0.0], dtype=np.float32), 5, euclidean) == []

    def test_remove_then_search_excludes_deleted(self):
        bf = BruteForce()
        bf.insert(_make_item(1, [1.0, 0.0]))
        bf.insert(_make_item(2, [0.9, 0.1]))
        bf.remove(1)
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = bf.knn(q, 5, euclidean)
        ids = [id_ for _, id_ in results]
        assert 1 not in ids
        assert 2 in ids


class TestBruteForceWithDemoData:
    def test_cs_query_returns_cs_top1(self, demo_items):
        """A CS-region query should return a CS item as the nearest neighbour."""
        bf = BruteForce()
        for meta, cat, emb in demo_items:
            id_ = hash((meta, cat)) % 10000
            bf.insert(VectorItem(id_, meta, cat, emb))

        # Strong CS query (high dims 0-3)
        q = np.array([0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
                      0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32)
        results = bf.knn(q, 1, cosine)
        assert len(results) == 1
        top_id = results[0][1]
        top_item = next(v for v in bf.items if v.id == top_id)
        assert top_item.category == "cs"
