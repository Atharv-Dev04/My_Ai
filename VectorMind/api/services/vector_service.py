"""
Vector service — thin orchestration layer between the router and VectorDB.

Keeps all engine calls in one place so routers stay free of business logic.
"""
from __future__ import annotations

import numpy as np
from fastapi import HTTPException

from engine.metrics import get_dist_fn
from engine.vector_db import BenchOut, SearchOut, VectorDB
from ingestion.demo_loader import load_demo


def seed_demo_data(db: VectorDB) -> None:
    """Populate VectorDB with the 20 canonical demo vectors (idempotent guard in caller)."""
    load_demo(db)


def insert_vector(
    db: VectorDB, metadata: str, category: str, embedding: list[float]
) -> int:
    """
    Validate dimension and insert a vector into all three indexes.

    Raises:
        HTTPException 422: wrong embedding dimension.
    """
    if db.size > 0 and len(embedding) != db.dims:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Embedding dimension mismatch: expected {db.dims}, "
                f"got {len(embedding)}."
            ),
        )
    emb = np.asarray(embedding, dtype=np.float32)
    dist_fn = get_dist_fn("cosine")   # HNSW is always built with cosine (same as C++)
    return db.insert(metadata, category, emb, dist_fn)


def search_vectors(
    db: VectorDB,
    embedding: list[float],
    k: int,
    metric: str,
    algo: str,
) -> SearchOut:
    """
    Run KNN search and return a SearchOut.

    Raises:
        HTTPException 422: wrong embedding dimension.
        HTTPException 400: empty index.
    """
    if db.size == 0:
        raise HTTPException(status_code=400, detail="Vector index is empty.")
    if len(embedding) != db.dims:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Embedding dimension mismatch: expected {db.dims}, "
                f"got {len(embedding)}."
            ),
        )
    q = np.asarray(embedding, dtype=np.float32)
    return db.search(q, k, metric, algo)


def benchmark_vectors(
    db: VectorDB, embedding: list[float], k: int, metric: str
) -> BenchOut:
    """
    Benchmark all three algorithms on the same query.

    Raises:
        HTTPException 400: empty index.
        HTTPException 422: wrong dimension.
    """
    if db.size == 0:
        raise HTTPException(status_code=400, detail="Vector index is empty.")
    if len(embedding) != db.dims:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Embedding dimension mismatch: expected {db.dims}, "
                f"got {len(embedding)}."
            ),
        )
    q = np.asarray(embedding, dtype=np.float32)
    return db.benchmark(q, k, metric)


def delete_vector(db: VectorDB, id_: int) -> None:
    """
    Remove a vector by id.

    Raises:
        HTTPException 404: id not found.
    """
    if not db.remove(id_):
        raise HTTPException(status_code=404, detail=f"Vector id={id_} not found.")
