"""
System router — health and status endpoints.

Endpoints:
    GET  /health   — lightweight liveness probe
    GET  /status   — Ollama availability + index stats
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_document_db, get_ollama, get_vector_db
from api.schemas.system import HealthResponse, StatusResponse
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.vector_db import VectorDB

router = APIRouter(tags=["system"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
    description="Returns ``{status: ok}`` when the API process is running.",
)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")


@router.get(
    "/status",
    response_model=StatusResponse,
    summary="System status",
    description=(
        "Returns Ollama availability, model names, and both index sizes. "
        "Maps to C++ ``GET /status`` (main.cpp:1065–1080)."
    ),
)
def status(
    vdb: VectorDB = Depends(get_vector_db),
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> StatusResponse:
    return StatusResponse(
        ollama_available=ollama.is_available(),
        embed_model=ollama.embed_model,
        gen_model=ollama.gen_model,
        doc_count=doc_db.size,
        doc_dims=doc_db.dims,
        demo_dims=vdb.dims,
        demo_count=vdb.size,
    )
