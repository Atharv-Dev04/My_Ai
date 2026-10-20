"""
Tests for DocumentDB (engine/document_db.py).
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.document_db import DocumentDB


def _rand_emb(dims: int = 8, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.random(dims).astype(np.float32)
    # Normalise so cosine distances are well-behaved
    return v / np.linalg.norm(v)


# ---------------------------------------------------------------------------
# Empty DocumentDB
# ---------------------------------------------------------------------------

class TestDocumentDBEmpty:
    def test_size_zero(self):
        assert DocumentDB().size == 0

    def test_dims_zero_before_insert(self):
        assert DocumentDB().dims == 0

    def test_all_empty(self):
        assert DocumentDB().all() == []

    def test_search_empty_returns_empty(self):
        db = DocumentDB()
        q = _rand_emb(8, 99)
        assert db.search(q, 3) == []

    def test_remove_nonexistent_returns_false(self):
        assert DocumentDB().remove(999) is False


# ---------------------------------------------------------------------------
# Insert and dims
# ---------------------------------------------------------------------------

class TestDocumentDBInsert:
    def test_ids_start_at_1(self):
        db = DocumentDB()
        id1 = db.insert("T1", "text1", _rand_emb(8, 1))
        assert id1 == 1

    def test_ids_auto_increment(self):
        db = DocumentDB()
        id1 = db.insert("T1", "text1", _rand_emb(8, 1))
        id2 = db.insert("T2", "text2", _rand_emb(8, 2))
        assert id2 == id1 + 1

    def test_dims_set_from_first_insert(self):
        db = DocumentDB()
        db.insert("T1", "text1", _rand_emb(64, 0))
        assert db.dims == 64

    def test_dims_unchanged_on_second_insert(self):
        db = DocumentDB()
        db.insert("T1", "text1", _rand_emb(64, 0))
        db.insert("T2", "text2", _rand_emb(64, 1))
        assert db.dims == 64

    def test_size_after_inserts(self):
        db = DocumentDB()
        for i in range(5):
            db.insert(f"T{i}", f"text{i}", _rand_emb(8, i))
        assert db.size == 5

    def test_all_returns_all_items(self):
        db = DocumentDB()
        for i in range(3):
            db.insert(f"T{i}", f"text{i}", _rand_emb(8, i))
        assert len(db.all()) == 3


# ---------------------------------------------------------------------------
# BruteForce vs HNSW threshold (< 10 → BruteForce, >= 10 → HNSW)
# ---------------------------------------------------------------------------

class TestDocumentDBThreshold:
    """
    DocumentDB switches from BruteForce to HNSW at exactly 10 items
    (same as C++: ``store.size() < 10``).
    Results should be correct in both modes.
    """

    def _build(self, n: int) -> tuple[DocumentDB, np.ndarray, np.ndarray]:
        """Build a DocumentDB with n items clustered in two groups."""
        db = DocumentDB()
        # Group A: embeddings roughly [1,0,0,0,0,0,0,0]
        # Group B: embeddings roughly [0,0,0,0,1,0,0,0]
        for i in range(n):
            if i % 2 == 0:
                base = np.array([0.9, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
            else:
                base = np.array([0.0, 0.0, 0.0, 0.0, 0.9, 0.1, 0.0, 0.0], dtype=np.float32)
            emb = (base + np.random.default_rng(i).random(8).astype(np.float32) * 0.01)
            emb /= np.linalg.norm(emb)
            db.insert(f"doc-{i}", f"content {i}", emb)
        q_a = np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
        q_b = np.array([0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        return db, q_a, q_b

    def test_below_threshold_top1_group_a(self):
        """BruteForce mode (n=5): top-1 for group-A query is an even-id item."""
        db, q_a, _ = self._build(5)
        assert db.size == 5  # below threshold
        results = db.search(q_a, 1)
        assert len(results) == 1
        _, doc = results[0]
        # Even-indexed docs (id 1,3,5 in 1-based) are group A
        assert doc.id % 2 == 1   # 1-based IDs: 1,3,5 are even-indexed (group A)

    def test_above_threshold_top1_group_a(self):
        """HNSW mode (n=10): top-1 for group-A query is still group A."""
        db, q_a, _ = self._build(10)
        assert db.size == 10  # at/above threshold
        results = db.search(q_a, 1)
        assert len(results) == 1
        _, doc = results[0]
        assert doc.id % 2 == 1   # odd IDs (1-based) → group A items

    def test_max_dist_filter(self):
        """Items beyond max_dist should be excluded."""
        db = DocumentDB()
        # Insert a single orthogonal item: cosine dist to [1,0] = 1.0
        db.insert("far", "content", np.array([0.0, 1.0], dtype=np.float32))
        q = np.array([1.0, 0.0], dtype=np.float32)
        # max_dist=0.5: distance ~1.0 should be filtered out
        results = db.search(q, 3, max_dist=0.5)
        assert results == []

    def test_max_dist_includes_close(self):
        """Items within max_dist should be included."""
        db = DocumentDB()
        db.insert("close", "content", np.array([1.0, 0.01], dtype=np.float32))
        q = np.array([1.0, 0.0], dtype=np.float32)
        results = db.search(q, 3, max_dist=0.7)
        assert len(results) == 1

    def test_results_have_correct_fields(self):
        db = DocumentDB()
        db.insert("My Title", "Some text content", _rand_emb(8, 0))
        q = _rand_emb(8, 99)
        results = db.search(q, 5, max_dist=2.0)
        if results:
            d, doc = results[0]
            assert isinstance(d, float)
            assert doc.title == "My Title"
            assert doc.text == "Some text content"
            assert doc.emb.dtype == np.float32


# ---------------------------------------------------------------------------
# Remove
# ---------------------------------------------------------------------------

class TestDocumentDBRemove:
    def test_remove_existing_returns_true(self):
        db = DocumentDB()
        id1 = db.insert("T1", "text1", _rand_emb(8, 0))
        assert db.remove(id1) is True

    def test_remove_decrements_size(self):
        db = DocumentDB()
        id1 = db.insert("T1", "text1", _rand_emb(8, 0))
        db.remove(id1)
        assert db.size == 0

    def test_remove_nonexistent_returns_false(self):
        db = DocumentDB()
        assert db.remove(999) is False

    def test_removed_item_not_in_search_results(self):
        db = DocumentDB()
        # Use a strongly aligned vector so it would normally be top-1
        target_emb = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        other_emb  = np.array([0.0, 1.0, 0.0, 0.0], dtype=np.float32)
        id1 = db.insert("target", "text", target_emb)
        db.insert("other",  "text", other_emb)
        db.remove(id1)
        q = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
        results = db.search(q, 5, max_dist=2.0)
        ids = [doc.id for _, doc in results]
        assert id1 not in ids
