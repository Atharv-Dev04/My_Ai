"""
Pydantic schemas for vector-search endpoints.

Mirrors the C++ REST contracts (main.cpp:766–1089) with typed models
and explicit validation.
"""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator


# ── Allowed values (same set as C++) ─────────────────────────────────────────

MetricLiteral = Literal["euclidean", "cosine", "manhattan"]
AlgoLiteral   = Literal["hnsw", "kdtree", "bruteforce"]


# ── Requests ──────────────────────────────────────────────────────────────────

class VectorInsertRequest(BaseModel):
    """
    Body for POST /vectors — insert a demo vector.

    C++ equivalent: POST /insert body ``{metadata, category, embedding}``.
    """

    metadata: str = Field(..., min_length=1, max_length=512, examples=["Linked List"])
    category: str = Field(..., min_length=1, max_length=128, examples=["cs"])
    embedding: list[float] = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Float vector; must match the index dimensionality (default 16).",
        examples=[[0.9, 0.85, 0.72, 0.68, 0.12, 0.08, 0.15, 0.10,
                   0.05, 0.08, 0.06, 0.09, 0.07, 0.11, 0.08, 0.06]],
    )

    @field_validator("embedding")
    @classmethod
    def embedding_finite(cls, v: list[float]) -> list[float]:
        import math
        for x in v:
            if not math.isfinite(x):
                raise ValueError("embedding must contain only finite values")
        return v


class VectorSearchRequest(BaseModel):
    """
    Body for POST /vectors/search.

    C++ equivalent: GET /search?v=...&k=...&metric=...&algo=...
    Changed to POST to support large embeddings cleanly.
    """

    embedding: list[float] = Field(
        ..., min_length=1, max_length=4096, description="Query vector"
    )
    k: Annotated[int, Field(ge=1, le=1000)] = Field(5, description="Number of results")
    metric: MetricLiteral = "cosine"
    algo: AlgoLiteral = "hnsw"

    @field_validator("embedding")
    @classmethod
    def embedding_finite(cls, v: list[float]) -> list[float]:
        import math
        for x in v:
            if not math.isfinite(x):
                raise ValueError("embedding must contain only finite values")
        return v


class BenchmarkRequest(BaseModel):
    """Body for POST /vectors/benchmark."""

    embedding: list[float] = Field(..., min_length=1, max_length=4096)
    k: Annotated[int, Field(ge=1, le=1000)] = 5
    metric: MetricLiteral = "cosine"

    @field_validator("embedding")
    @classmethod
    def embedding_finite(cls, v: list[float]) -> list[float]:
        import math
        for x in v:
            if not math.isfinite(x):
                raise ValueError("embedding must contain only finite values")
        return v


# ── Responses ─────────────────────────────────────────────────────────────────

class VectorInsertResponse(BaseModel):
    """Response for POST /vectors."""

    id: int


class SearchHitResponse(BaseModel):
    """One result from a KNN search."""

    id: int
    metadata: str
    category: str
    distance: float
    embedding: list[float]


class VectorSearchResponse(BaseModel):
    """Response for POST /vectors/search."""

    results: list[SearchHitResponse]
    latency_us: float
    algo: str
    metric: str


class VectorListItemResponse(BaseModel):
    """One item in GET /vectors response."""

    id: int
    metadata: str
    category: str
    embedding: list[float]


class BenchmarkResponse(BaseModel):
    """Response for POST /vectors/benchmark."""

    bruteforce_us: float
    kdtree_us: float
    hnsw_us: float
    item_count: int


class HNSWNodeResponse(BaseModel):
    id: int
    metadata: str
    category: str
    max_layer: int


class HNSWEdgeResponse(BaseModel):
    src: int
    dst: int
    layer: int


class HNSWInfoResponse(BaseModel):
    """Response for GET /vectors/hnsw-info."""

    top_layer: int
    node_count: int
    nodes_per_layer: list[int]
    edges_per_layer: list[int]
    nodes: list[HNSWNodeResponse]
    edges: list[HNSWEdgeResponse]


class StatsResponse(BaseModel):
    """Response for GET /vectors/stats."""

    count: int
    dims: int
    algorithms: list[str]
    metrics: list[str]
