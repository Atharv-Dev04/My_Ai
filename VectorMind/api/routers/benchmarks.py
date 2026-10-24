"""
Benchmarks and Evaluation router.

Endpoints:
    GET  /benchmarks/results    Retrieve reproducible benchmark dataset (hardware, latency, recall)
    POST /benchmarks/evaluate   Evaluate a set of retrieved results against ground truth (Recall, Precision, MRR)
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from engine.evaluation import (
    recall_at_k,
    precision_at_k,
    reciprocal_rank,
    mean_reciprocal_rank,
    average_precision_at_k,
)

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

BENCHMARK_FILE = Path(__file__).resolve().parent.parent.parent / "benchmarks" / "results" / "bench.json"


class QueryEvaluationItem(BaseModel):
    query_id: str | int
    retrieved_ids: List[int | str]
    ground_truth_ids: List[int | str]


class EvaluationRequest(BaseModel):
    queries: List[QueryEvaluationItem] = Field(..., min_length=1)
    k: int = Field(10, ge=1, le=100)


class EvaluationSummary(BaseModel):
    queries_evaluated: int
    k: int
    mean_recall_at_k: float
    mean_precision_at_k: float
    mrr: float
    mean_map_at_k: float


@router.get(
    "/results",
    summary="Retrieve empirical benchmark data",
    description="Returns empirical benchmark measurements across BruteForce, KDTree, and HNSW including index build time, throughput, median/p95 latency, and Recall@K.",
)
def get_benchmark_results() -> Dict[str, Any]:
    if not BENCHMARK_FILE.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benchmark measurements file not found. Run python -m benchmarks.run_bench to generate.",
        )
    try:
        data = json.loads(BENCHMARK_FILE.read_text(encoding="utf-8"))
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load benchmark measurements: {e}",
        )


@router.post(
    "/evaluate",
    response_model=EvaluationSummary,
    summary="Evaluate retrieved chunks against ground truth labels",
    description="Calculates Recall@K, Precision@K, MRR, and MAP@K for a provided evaluation dataset.",
)
def evaluate_retrieval(body: EvaluationRequest) -> EvaluationSummary:
    recalls: List[float] = []
    precisions: List[float] = []
    retrieved_lists: List[List[Any]] = []
    gt_lists: List[List[Any]] = []
    maps: List[float] = []

    for item in body.queries:
        r_k = recall_at_k(item.retrieved_ids, item.ground_truth_ids, body.k)
        p_k = precision_at_k(item.retrieved_ids, item.ground_truth_ids, body.k)
        map_k = average_precision_at_k(item.retrieved_ids, item.ground_truth_ids, body.k)

        recalls.append(r_k)
        precisions.append(p_k)
        maps.append(map_k)
        retrieved_lists.append(item.retrieved_ids)
        gt_lists.append(item.ground_truth_ids)

    mrr = mean_reciprocal_rank(retrieved_lists, gt_lists)
    n = len(body.queries)

    return EvaluationSummary(
        queries_evaluated=n,
        k=body.k,
        mean_recall_at_k=round(sum(recalls) / n, 4),
        mean_precision_at_k=round(sum(precisions) / n, 4),
        mrr=round(mrr, 4),
        mean_map_at_k=round(sum(maps) / n, 4),
    )
