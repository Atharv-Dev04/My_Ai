"""
Information Retrieval (IR) and RAG Evaluation Metrics.

Computes exact evaluation metrics for information retrieval and generation:
  - recall_at_k: proportion of ground-truth relevant items retrieved in top-k
  - precision_at_k: proportion of top-k retrieved items that are relevant
  - mrr: Mean Reciprocal Rank of the first relevant retrieved item
  - mean_average_precision (map_at_k): Mean Average Precision across queries
"""
from __future__ import annotations

from typing import List, Set, Sequence, Any


def recall_at_k(retrieved_ids: Sequence[Any], ground_truth_ids: Set[Any] | Sequence[Any], k: int) -> float:
    """
    Calculate Recall@K:
        Recall@K = |Retrieved_K ∩ Relevant| / |Relevant|

    Returns 0.0 if ground_truth_ids is empty.
    """
    gt_set = set(ground_truth_ids)
    if not gt_set:
        return 0.0
    top_k = set(retrieved_ids[:k])
    hits = len(top_k & gt_set)
    return float(hits / len(gt_set))


def precision_at_k(retrieved_ids: Sequence[Any], ground_truth_ids: Set[Any] | Sequence[Any], k: int) -> float:
    """
    Calculate Precision@K:
        Precision@K = |Retrieved_K ∩ Relevant| / K

    Returns 0.0 if k <= 0.
    """
    if k <= 0:
        return 0.0
    gt_set = set(ground_truth_ids)
    top_k = set(retrieved_ids[:k])
    hits = len(top_k & gt_set)
    return float(hits / k)


def reciprocal_rank(retrieved_ids: Sequence[Any], ground_truth_ids: Set[Any] | Sequence[Any]) -> float:
    """
    Calculate Reciprocal Rank (RR):
        RR = 1 / rank_of_first_relevant_item
        (1-indexed rank). Returns 0.0 if no relevant items retrieved.
    """
    gt_set = set(ground_truth_ids)
    for rank, item_id in enumerate(retrieved_ids, start=1):
        if item_id in gt_set:
            return float(1.0 / rank)
    return 0.0


def mean_reciprocal_rank(
    query_retrieved: Sequence[Sequence[Any]],
    query_ground_truth: Sequence[Set[Any] | Sequence[Any]],
) -> float:
    """
    Calculate Mean Reciprocal Rank (MRR) across multiple queries:
        MRR = (1 / Q) * sum(RR_q)
    """
    if not query_retrieved or not query_ground_truth:
        return 0.0
    total_rr = sum(
        reciprocal_rank(retrieved, gt)
        for retrieved, gt in zip(query_retrieved, query_ground_truth)
    )
    return float(total_rr / len(query_retrieved))


def average_precision_at_k(
    retrieved_ids: Sequence[Any],
    ground_truth_ids: Set[Any] | Sequence[Any],
    k: int,
) -> float:
    """
    Calculate Average Precision@K (AP@K):
        AP@K = sum_{i=1}^K (Precision@i * rel(i)) / min(K, |Relevant|)
    """
    gt_set = set(ground_truth_ids)
    if not gt_set or k <= 0:
        return 0.0

    score = 0.0
    hits = 0
    top_k = list(retrieved_ids[:k])

    for i, item_id in enumerate(top_k, start=1):
        if item_id in gt_set:
            hits += 1
            score += hits / i

    norm = min(k, len(gt_set))
    return float(score / norm) if norm > 0 else 0.0
