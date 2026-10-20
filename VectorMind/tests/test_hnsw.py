"""
Tests for HNSW (engine/hnsw.py).

Strategy:
  - Structural tests (size, remove, get_info) can be exact.
  - Recall tests use the 20-item demo dataset: with M=16 and only 20 nodes
    the HNSW graph is nearly fully connected, so 100% recall is expected.
  - We do NOT test bit-for-bit match with C++ output because of Deviation D1
    (different RNG float sequences despite same algorithm).
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.brute_force import BruteForce
from engine.hnsw import HNSW
from engine.metrics import cosine, euclidean
from engine.models import VectorItem


def _make_item(id_: int, v: list[float], cat: str = "t") -> VectorItem:
    return VectorItem(id_, f"item-{id_}", cat, np.array(v, dtype=np.float32))


def _ids(results) -> list[int]:
    return [id_ for _, id_ in results]


# ---------------------------------------------------------------------------
# Empty / single-item edge cases
# ---------------------------------------------------------------------------

class TestHNSWEmpty:
    def test_knn_empty_graph(self):
        h = HNSW()
        q = np.array([1.0, 0.0], dtype=np.float32)
        assert h.knn(q, 5, 50, euclidean) == []

    def test_size_zero(self):
        assert HNSW().size == 0

    def test_get_info_empty(self):
        gi = HNSW().get_info()
        assert gi.node_count == 0
        assert gi.top_layer == -1

    def test_remove_nonexistent_is_noop(self):
        h = HNSW()
        h.remove(42)   # must not raise
        assert h.size == 0


class TestHNSWSingleItem:
    def test_knn_returns_the_only_item(self):
        h = HNSW()
        item = _make_item(1, [1.0, 0.0])
        h.insert(item, euclidean)
        results = h.knn(np.array([0.5, 0.0], dtype=np.float32), 5, 50, euclidean)
        assert _ids(results) == [1]

    def test_size_after_insert(self):
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        assert h.size == 1

    def test_get_info_single(self):
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        gi = h.get_info()
        assert gi.node_count == 1
        assert len(gi.nodes) == 1
        assert gi.nodes[0].id == 1


# ---------------------------------------------------------------------------
# Insert / size / remove
# ---------------------------------------------------------------------------

class TestHNSWInsertRemove:
    def test_size_tracks_inserts(self):
        h = HNSW()
        for i in range(5):
            h.insert(_make_item(i + 1, [float(i), 0.0]), euclidean)
        assert h.size == 5

    def test_remove_decrements_size(self):
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        h.insert(_make_item(2, [0.0, 1.0]), euclidean)
        h.remove(1)
        assert h.size == 1

    def test_remove_excludes_from_knn(self):
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        h.insert(_make_item(2, [0.9, 0.1]), euclidean)
        h.insert(_make_item(3, [0.0, 1.0]), euclidean)
        h.remove(1)
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = h.knn(q, 5, 50, euclidean)
        assert 1 not in _ids(results)

    def test_remove_all_then_knn_empty(self):
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        h.remove(1)
        assert h.knn(np.array([1.0, 0.0], dtype=np.float32), 3, 50, euclidean) == []

    def test_size_zero_after_full_removal(self):
        h = HNSW()
        for i in range(4):
            h.insert(_make_item(i + 1, [float(i), float(i)]), euclidean)
        for i in range(4):
            h.remove(i + 1)
        assert h.size == 0

    def test_duplicate_remove_is_noop(self):
        """Removing the same id twice should not crash."""
        h = HNSW()
        h.insert(_make_item(1, [1.0, 0.0]), euclidean)
        h.remove(1)
        h.remove(1)    # second call: should be a no-op
        assert h.size == 0


# ---------------------------------------------------------------------------
# KNN result properties
# ---------------------------------------------------------------------------

class TestHNSWKNN:
    def test_results_sorted_ascending(self):
        h = HNSW(seed=0)
        for i in range(8):
            h.insert(_make_item(i + 1, [float(i), 0.0]), euclidean)
        q = np.array([3.5, 0.0], dtype=np.float32)
        results = h.knn(q, 5, 50, euclidean)
        dists = [d for d, _ in results]
        assert dists == sorted(dists)

    def test_k_limits_results(self):
        h = HNSW(seed=1)
        for i in range(10):
            h.insert(_make_item(i + 1, [float(i), 0.0]), euclidean)
        results = h.knn(np.array([5.0, 0.0], dtype=np.float32), 3, 50, euclidean)
        assert len(results) <= 3

    def test_distances_non_negative(self):
        h = HNSW(seed=2)
        for i in range(6):
            h.insert(_make_item(i + 1, [float(i) * 0.1, 0.0]), euclidean)
        results = h.knn(np.array([0.25, 0.0], dtype=np.float32), 6, 50, euclidean)
        for d, _ in results:
            assert d >= 0.0


# ---------------------------------------------------------------------------
# Recall vs BruteForce on 20-item demo dataset
# ---------------------------------------------------------------------------

class TestHNSWRecallOnDemoData:
    """
    With M=16 and N=20, the HNSW graph at layer 0 has degree M0=32, which
    exceeds N-1=19.  The graph is therefore fully connected, and HNSW should
    return results identical to BruteForce (100% recall).
    """

    QUERIES = {
        "cs": np.array([0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
                        0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32),
        "math": np.array([0.05,0.05,0.05,0.05,0.90,0.85,0.80,0.75,
                          0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32),
        "food": np.array([0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,
                          0.90,0.85,0.80,0.75,0.05,0.05,0.05,0.05], dtype=np.float32),
        "sports": np.array([0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,
                            0.05,0.05,0.05,0.05,0.90,0.85,0.80,0.75], dtype=np.float32),
    }

    @pytest.fixture(autouse=True)
    def build_indexes(self, demo_items):
        self.h = HNSW(m=16, ef_build=200, seed=42)
        self.bf = BruteForce()
        for i, (meta, cat, emb) in enumerate(demo_items):
            item = VectorItem(i + 1, meta, cat, emb)
            self.h.insert(item, cosine)
            self.bf.insert(item)

    def test_size_matches_demo(self):
        assert self.h.size == 20

    @pytest.mark.parametrize("cat", ["cs", "math", "food", "sports"])
    def test_top1_category_matches_bf(self, cat):
        """Top-1 HNSW result must agree with BruteForce top-1."""
        q = self.QUERIES[cat]
        hnsw_top = self.h.knn(q, 1, 50, cosine)[0][1]
        bf_top = self.bf.knn(q, 1, cosine)[0][1]
        assert hnsw_top == bf_top, (
            f"cat={cat}: HNSW top-1={hnsw_top}, BF top-1={bf_top}"
        )

    @pytest.mark.parametrize("cat", ["cs", "math", "food", "sports"])
    def test_top5_recall_perfect(self, cat):
        """Recall@5 must be 100% (5/5) on the fully connected 20-item graph."""
        q = self.QUERIES[cat]
        hnsw_ids = set(_ids(self.h.knn(q, 5, 50, cosine)))
        bf_ids = set(_ids(self.bf.knn(q, 5, cosine)))
        recall = len(hnsw_ids & bf_ids) / len(bf_ids)
        assert recall == 1.0, (
            f"cat={cat}: recall={recall:.2f}, HNSW={hnsw_ids}, BF={bf_ids}"
        )

    @pytest.mark.parametrize("cat", ["cs", "math", "food", "sports"])
    def test_top1_is_correct_category(self, cat):
        """The nearest neighbour by cosine distance should be in the right category."""
        q = self.QUERIES[cat]
        top_id = self.h.knn(q, 1, 50, cosine)[0][1]
        # Recover the VectorItem from HNSW graph
        top_item = self.h._G[top_id].item
        assert top_item.category == cat, (
            f"Expected category={cat}, got {top_item.category}"
        )


# ---------------------------------------------------------------------------
# get_info
# ---------------------------------------------------------------------------

class TestHNSWGetInfo:
    def test_node_count(self, demo_items):
        h = HNSW(seed=42)
        for i, (meta, cat, emb) in enumerate(demo_items):
            h.insert(VectorItem(i + 1, meta, cat, emb), cosine)
        gi = h.get_info()
        assert gi.node_count == 20

    def test_layer0_has_all_nodes(self, demo_items):
        """Every node appears in layer 0."""
        h = HNSW(seed=42)
        for i, (meta, cat, emb) in enumerate(demo_items):
            h.insert(VectorItem(i + 1, meta, cat, emb), cosine)
        gi = h.get_info()
        assert gi.nodes_per_layer[0] == 20

    def test_edges_non_negative(self, demo_items):
        h = HNSW(seed=42)
        for i, (meta, cat, emb) in enumerate(demo_items):
            h.insert(VectorItem(i + 1, meta, cat, emb), cosine)
        gi = h.get_info()
        for e in gi.edges_per_layer:
            assert e >= 0

    def test_nodes_list_matches_count(self, demo_items):
        h = HNSW(seed=42)
        for i, (meta, cat, emb) in enumerate(demo_items):
            h.insert(VectorItem(i + 1, meta, cat, emb), cosine)
        gi = h.get_info()
        assert len(gi.nodes) == gi.node_count
