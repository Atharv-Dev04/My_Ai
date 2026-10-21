"""
Vectors router — demo vector CRUD, search, benchmark, and HNSW info.

Endpoints:
    POST   /vectors                  insert a vector
    GET    /vectors                  list all vectors
    GET    /vectors/stats            index statistics
    DELETE /vectors/{id}             delete a vector
    POST   /vectors/search           KNN search
    POST   /vectors/benchmark        time all three algorithms
    GET    /vectors/hnsw-info        HNSW graph structure
    POST   /vectors/load-demo        load the 20 canonical demo vectors

All endpoints call the Python VectorDB engine directly.
The C++ executable is NOT used.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_vector_db
from api.schemas.vectors import (
    BenchmarkRequest,
    BenchmarkResponse,
    HNSWEdgeResponse,
    HNSWInfoResponse,
    HNSWNodeResponse,
    StatsResponse,
    VectorInsertRequest,
    VectorInsertResponse,
    VectorListItemResponse,
    VectorSearchRequest,
    VectorSearchResponse,
    SearchHitResponse,
)
from api.services.vector_service import (
    benchmark_vectors,
    delete_vector,
    insert_vector,
    search_vectors,
    seed_demo_data,
)
from engine.vector_db import VectorDB

router = APIRouter(prefix="/vectors", tags=["vectors"])


# ── POST /vectors ─────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=VectorInsertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Insert a vector",
    description=(
        "Insert a manually-supplied embedding into the demo index (BruteForce + KDTree + HNSW). "
        "Mirrors C++ ``POST /insert`` (main.cpp:766). "
        "The embedding dimension must match the index (default 16)."
    ),
)
def insert(
    body: VectorInsertRequest,
    vdb: VectorDB = Depends(get_vector_db),
) -> VectorInsertResponse:
    id_ = insert_vector(vdb, body.metadata, body.category, body.embedding)
    return VectorInsertResponse(id=id_)


# ── GET /vectors ──────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[VectorListItemResponse],
    summary="List all vectors",
    description="Return all items in the demo VectorDB. Mirrors C++ ``GET /list`` (main.cpp:812).",
)
def list_vectors(
    vdb: VectorDB = Depends(get_vector_db),
) -> list[VectorListItemResponse]:
    return [
        VectorListItemResponse(
            id=item.id,
            metadata=item.metadata,
            category=item.category,
            embedding=item.emb.tolist(),
        )
        for item in vdb.all()
    ]


# ── GET /vectors/stats ────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Index statistics",
    description="Returns item count, dimension, and supported algorithms/metrics.",
)
def stats(
    vdb: VectorDB = Depends(get_vector_db),
) -> StatsResponse:
    return StatsResponse(
        count=vdb.size,
        dims=vdb.dims,
        algorithms=["hnsw", "kdtree", "bruteforce"],
        metrics=["cosine", "euclidean", "manhattan"],
    )


# ── DELETE /vectors/{id} ──────────────────────────────────────────────────────

@router.delete(
    "/{id_}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vector",
    description="Remove a vector by its id. Returns 404 if not found. Mirrors C++ ``GET /remove`` (main.cpp:830).",
)
def delete(
    id_: int,
    vdb: VectorDB = Depends(get_vector_db),
) -> None:
    delete_vector(vdb, id_)


# ── POST /vectors/search ──────────────────────────────────────────────────────

@router.post(
    "/search",
    response_model=VectorSearchResponse,
    summary="KNN search",
    description=(
        "Search the demo vector index using the requested algorithm and metric. "
        "Mirrors C++ ``GET /search`` (main.cpp:848). "
        "Changed to POST to support arbitrary-length embeddings without URL limits."
    ),
)
def search(
    body: VectorSearchRequest,
    vdb: VectorDB = Depends(get_vector_db),
) -> VectorSearchResponse:
    out = search_vectors(vdb, body.embedding, body.k, body.metric, body.algo)
    return VectorSearchResponse(
        results=[
            SearchHitResponse(
                id=h.id,
                metadata=h.meta,
                category=h.cat,
                distance=h.dist,
                embedding=h.emb.tolist(),
            )
            for h in out.hits
        ],
        latency_us=out.latency_us,
        algo=out.algo,
        metric=out.metric,
    )


# ── POST /vectors/benchmark ───────────────────────────────────────────────────

@router.post(
    "/benchmark",
    response_model=BenchmarkResponse,
    summary="Algorithm benchmark",
    description=(
        "Time BruteForce, KDTree, and HNSW on the same query. "
        "Mirrors C++ ``GET /benchmark`` (main.cpp:876)."
    ),
)
def benchmark(
    body: BenchmarkRequest,
    vdb: VectorDB = Depends(get_vector_db),
) -> BenchmarkResponse:
    out = benchmark_vectors(vdb, body.embedding, body.k, body.metric)
    return BenchmarkResponse(
        bruteforce_us=out.bf_us,
        kdtree_us=out.kd_us,
        hnsw_us=out.hnsw_us,
        item_count=out.n,
    )


# ── GET /vectors/hnsw-info ────────────────────────────────────────────────────

@router.get(
    "/hnsw-info",
    response_model=HNSWInfoResponse,
    summary="HNSW graph info",
    description=(
        "Return the full HNSW graph structure (nodes, layers, edges). "
        "Mirrors C++ ``GET /hnsw-info`` (main.cpp:910)."
    ),
)
def hnsw_info(
    vdb: VectorDB = Depends(get_vector_db),
) -> HNSWInfoResponse:
    gi = vdb.hnsw_info()
    return HNSWInfoResponse(
        top_layer=gi.top_layer,
        node_count=gi.node_count,
        nodes_per_layer=gi.nodes_per_layer,
        edges_per_layer=gi.edges_per_layer,
        nodes=[
            HNSWNodeResponse(
                id=n.id,
                metadata=n.metadata,
                category=n.category,
                max_layer=n.max_lyr,
            )
            for n in gi.nodes
        ],
        edges=[
            HNSWEdgeResponse(src=e.src, dst=e.dst, layer=e.lyr)
            for e in gi.edges
        ],
    )


# ── POST /vectors/load-demo ───────────────────────────────────────────────────

@router.post(
    "/load-demo",
    response_model=VectorInsertResponse,
    status_code=status.HTTP_200_OK,
    summary="Load demo vectors",
    description=(
        "Load the 20 canonical 16-D demo vectors into the index. "
        "Idempotent: if the index already has items, returns 409. "
        "Mirrors C++ ``GET /load-demo`` (main.cpp:950)."
    ),
)
def load_demo(
    vdb: VectorDB = Depends(get_vector_db),
) -> dict:
    if vdb.size > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Index already contains {vdb.size} items. Clear it first.",
        )
    seed_demo_data(vdb)
    return {"id": vdb.size}
