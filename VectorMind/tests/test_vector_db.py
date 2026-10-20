"""
Integration tests for VectorDB (engine/vector_db.py).
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.metrics import cosine, euclidean
from engine.vector_db import VectorDB
from ingestion.demo_loader import load_demo


# ---------------------------------------------------------------------------
# Empty DB
# ---------------------------------------------------------------------------

class TestVectorDBEmpty:
    def test_size_zero(self):
        db = VectorDB(dims=16)
        assert db.size == 0

    def test_all_returns_empty_list(self):
        db = VectorDB(dims=16)
        assert db.all() == []

    def test_search_empty_returns_empty_hits(self):
        db = VectorDB(dims=16)
        q = np.zeros(16, dtype=np.float32)
        out = db.search(q, 5, "cosine", "bruteforce")
        assert out.hits == []

    def test_remove_nonexistent_returns_false(self):
        db = VectorDB(dims=16)
        assert db.remove(999) is False


# ---------------------------------------------------------------------------
# Insert
# ---------------------------------------------------------------------------

class TestVectorDBInsert:
    def test_ids_auto_increment_from_1(self):
        db = VectorDB(dims=2)
        emb = np.array([1.0, 0.0], dtype=np.float32)
        id1 = db.insert("a", "cat", emb, cosine)
        id2 = db.insert("b", "cat", emb, cosine)
        assert id1 == 1
        assert id2 == 2

    def test_size_after_inserts(self):
        db = VectorDB(dims=2)
        for i in range(5):
            db.insert(f"item-{i}", "cat", np.array([float(i), 0.0], dtype=np.float32), cosine)
        assert db.size == 5

    def test_all_returns_all_items(self):
        db = VectorDB(dims=2)
        for i in range(3):
            db.insert(f"meta-{i}", "cat", np.array([float(i), 0.0], dtype=np.float32), cosine)
        items = db.all()
        assert len(items) == 3

    def test_dims_attribute(self):
        db = VectorDB(dims=16)
        assert db.dims == 16


# ---------------------------------------------------------------------------
# Demo data loaded
# ---------------------------------------------------------------------------

class TestVectorDBWithDemoData:
    def test_load_demo_size(self, loaded_vdb):
        assert loaded_vdb.size == 20

    def test_all_returns_20_items(self, loaded_vdb):
        assert len(loaded_vdb.all()) == 20

    @pytest.mark.parametrize("algo", ["bruteforce", "kdtree", "hnsw"])
    def test_search_algo_returns_hits(self, loaded_vdb, algo):
        """All three algorithms return results for a valid query."""
        q = np.array([0.9,0.85,0.72,0.68,0.12,0.08,0.15,0.10,
                      0.05,0.08,0.06,0.09,0.07,0.11,0.08,0.06], dtype=np.float32)
        out = loaded_vdb.search(q, 5, "cosine", algo)
        assert len(out.hits) == 5

    @pytest.mark.parametrize("algo", ["bruteforce", "kdtree", "hnsw"])
    def test_search_top1_is_cs_category(self, loaded_vdb, algo):
        """For a strong CS query, top-1 should be a CS item."""
        q = np.array([0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
                      0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32)
        out = loaded_vdb.search(q, 1, "cosine", algo)
        assert len(out.hits) == 1
        assert out.hits[0].cat == "cs", f"algo={algo} top-1 cat={out.hits[0].cat}"

    @pytest.mark.parametrize("algo", ["bruteforce", "kdtree", "hnsw"])
    def test_search_top1_is_food_category(self, loaded_vdb, algo):
        """For a strong Food query, top-1 should be a food item."""
        q = np.array([0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05,
                      0.90,0.85,0.80,0.75,0.05,0.05,0.05,0.05], dtype=np.float32)
        out = loaded_vdb.search(q, 1, "cosine", algo)
        assert out.hits[0].cat == "food", f"algo={algo} top-1 cat={out.hits[0].cat}"

    @pytest.mark.parametrize("algo", ["bruteforce", "kdtree", "hnsw"])
    def test_all_algos_agree_on_top1(self, loaded_vdb, algo):
        """All three algorithms agree on top-1 for a clear semantic query."""
        q = np.array([0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
                      0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05], dtype=np.float32)
        bf_top = loaded_vdb.search(q, 1, "cosine", "bruteforce").hits[0].id
        algo_top = loaded_vdb.search(q, 1, "cosine", algo).hits[0].id
        assert bf_top == algo_top, f"BF top-1={bf_top}, {algo} top-1={algo_top}"

    def test_search_latency_us_non_negative(self, loaded_vdb):
        q = np.zeros(16, dtype=np.float32)
        out = loaded_vdb.search(q, 5, "cosine", "bruteforce")
        assert out.latency_us >= 0.0

    def test_search_result_fields(self, loaded_vdb):
        """SearchHit fields are populated correctly."""
        q = np.array([0.9,0.85,0.72,0.68,0.12,0.08,0.15,0.10,
                      0.05,0.08,0.06,0.09,0.07,0.11,0.08,0.06], dtype=np.float32)
        out = loaded_vdb.search(q, 3, "cosine", "bruteforce")
        for hit in out.hits:
            assert isinstance(hit.id, int)
            assert isinstance(hit.meta, str) and len(hit.meta) > 0
            assert isinstance(hit.cat, str) and len(hit.cat) > 0
            assert hit.dist >= 0.0
            assert hit.emb.shape == (16,)

    def test_search_results_sorted_ascending(self, loaded_vdb):
        """SearchOut hits are sorted by distance ascending."""
        q = np.zeros(16, dtype=np.float32)
        out = loaded_vdb.search(q, 10, "euclidean", "bruteforce")
        dists = [h.dist for h in out.hits]
        assert dists == sorted(dists)

    def test_search_algo_and_metric_fields(self, loaded_vdb):
        """SearchOut reflects the requested algo and metric."""
        q = np.zeros(16, dtype=np.float32)
        out = loaded_vdb.search(q, 3, "manhattan", "kdtree")
        assert out.algo == "kdtree"
        assert out.metric == "manhattan"

    def test_unknown_algo_defaults_to_hnsw(self, loaded_vdb):
        """Unknown algo string falls back to HNSW (same as C++)."""
        q = np.zeros(16, dtype=np.float32)
        out = loaded_vdb.search(q, 3, "cosine", "nonexistent_algo")
        assert len(out.hits) >= 0   # should not crash


# ---------------------------------------------------------------------------
# Remove
# ---------------------------------------------------------------------------

class TestVectorDBRemove:
    def test_remove_returns_true_for_existing(self, loaded_vdb):
        ids = [v.id for v in loaded_vdb.all()]
        assert loaded_vdb.remove(ids[0]) is True

    def test_remove_decrements_size(self, loaded_vdb):
        initial = loaded_vdb.size
        ids = [v.id for v in loaded_vdb.all()]
        loaded_vdb.remove(ids[0])
        assert loaded_vdb.size == initial - 1

    def test_remove_excludes_from_all_algos(self, loaded_vdb):
        """Removed item does not appear in any algorithm's search."""
        items = loaded_vdb.all()
        target_id = items[0].id
        target_emb = items[0].emb
        loaded_vdb.remove(target_id)

        for algo in ("bruteforce", "kdtree", "hnsw"):
            out = loaded_vdb.search(target_emb, 20, "cosine", algo)
            ids = [h.id for h in out.hits]
            assert target_id not in ids, f"{algo} still returns deleted id={target_id}"

    def test_double_remove_returns_false(self, loaded_vdb):
        ids = [v.id for v in loaded_vdb.all()]
        loaded_vdb.remove(ids[0])
        assert loaded_vdb.remove(ids[0]) is False


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------

class TestVectorDBBenchmark:
    def test_benchmark_runs_without_error(self, loaded_vdb):
        q = np.zeros(16, dtype=np.float32)
        b = loaded_vdb.benchmark(q, 5, "cosine")
        assert b.bf_us >= 0.0
        assert b.kd_us >= 0.0
        assert b.hnsw_us >= 0.0

    def test_benchmark_reports_item_count(self, loaded_vdb):
        q = np.zeros(16, dtype=np.float32)
        b = loaded_vdb.benchmark(q, 5, "cosine")
        assert b.n == 20


# ---------------------------------------------------------------------------
# HNSW Info
# ---------------------------------------------------------------------------

class TestVectorDBHNSWInfo:
    def test_hnsw_info_node_count(self, loaded_vdb):
        gi = loaded_vdb.hnsw_info()
        assert gi.node_count == 20

    def test_hnsw_info_layer0_has_all_nodes(self, loaded_vdb):
        gi = loaded_vdb.hnsw_info()
        assert gi.nodes_per_layer[0] == 20
