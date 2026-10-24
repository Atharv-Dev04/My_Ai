"""
Tests for Information Retrieval evaluation metrics (Recall@K, Precision@K, MRR, AP@K).
"""
import pytest
from engine.evaluation import (
    recall_at_k,
    precision_at_k,
    reciprocal_rank,
    mean_reciprocal_rank,
    average_precision_at_k,
)


def test_recall_at_k():
    ground_truth = {1, 3, 5}
    retrieved = [1, 2, 4, 3, 6, 5]

    # k = 2: retrieved [1, 2], hits = {1} -> 1/3
    assert pytest.approx(recall_at_k(retrieved, ground_truth, 2), rel=1e-5) == 1.0 / 3.0
    # k = 4: retrieved [1, 2, 4, 3], hits = {1, 3} -> 2/3
    assert pytest.approx(recall_at_k(retrieved, ground_truth, 4), rel=1e-5) == 2.0 / 3.0
    # k = 6: retrieved all 3 hits -> 3/3 = 1.0
    assert recall_at_k(retrieved, ground_truth, 6) == 1.0

    # Empty ground truth edge case
    assert recall_at_k(retrieved, set(), 5) == 0.0


def test_precision_at_k():
    ground_truth = {1, 3, 5}
    retrieved = [1, 2, 3, 4, 5]

    # k = 1: [1] hit 1/1 = 1.0
    assert precision_at_k(retrieved, ground_truth, 1) == 1.0
    # k = 2: [1, 2] hit 1/2 = 0.5
    assert precision_at_k(retrieved, ground_truth, 2) == 0.5
    # k = 3: [1, 2, 3] hits {1, 3} -> 2/3
    assert pytest.approx(precision_at_k(retrieved, ground_truth, 3), rel=1e-5) == 2.0 / 3.0

    # k <= 0 edge case
    assert precision_at_k(retrieved, ground_truth, 0) == 0.0


def test_reciprocal_rank_and_mrr():
    gt1 = {10}
    retrieved1 = [1, 2, 10, 4]  # first relevant at index 3 -> rank 3 -> 1/3
    assert pytest.approx(reciprocal_rank(retrieved1, gt1), rel=1e-5) == 1.0 / 3.0

    gt2 = {5}
    retrieved2 = [5, 1, 2]  # first relevant at index 1 -> rank 1 -> 1.0
    assert reciprocal_rank(retrieved2, gt2) == 1.0

    gt3 = {99}
    retrieved3 = [1, 2, 3]  # none relevant -> 0.0
    assert reciprocal_rank(retrieved3, gt3) == 0.0

    # MRR across the 3 queries
    # (1/3 + 1.0 + 0.0) / 3 = 4/9 = ~0.4444
    mrr = mean_reciprocal_rank([retrieved1, retrieved2, retrieved3], [gt1, gt2, gt3])
    assert pytest.approx(mrr, rel=1e-5) == (1.0 / 3.0 + 1.0 + 0.0) / 3.0


def test_average_precision_at_k():
    ground_truth = {1, 3, 5}
    # Rank 1: 1 (rel, P@1 = 1/1 = 1)
    # Rank 2: 2 (not rel)
    # Rank 3: 3 (rel, P@3 = 2/3)
    # Rank 4: 4 (not rel)
    # Rank 5: 5 (rel, P@5 = 3/5)
    retrieved = [1, 2, 3, 4, 5]
    ap_5 = average_precision_at_k(retrieved, ground_truth, 5)
    expected = (1.0 + 2.0 / 3.0 + 3.0 / 5.0) / 3.0
    assert pytest.approx(ap_5, rel=1e-5) == expected
