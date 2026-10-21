"""
Pydantic schemas for system / health endpoints.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response for GET /health."""

    status: str = Field(..., examples=["ok"])
    version: str = Field("0.1.0", examples=["0.1.0"])


class StatusResponse(BaseModel):
    """
    Response for GET /status.

    Mirrors the C++ ``/status`` endpoint (main.cpp:1065–1080) with
    Python-idiomatic field names.
    """

    ollama_available: bool = Field(
        ..., description="True when Ollama responds on /api/tags within 2 s"
    )
    embed_model: str = Field(..., examples=["nomic-embed-text"])
    gen_model: str = Field(..., examples=["llama3.2"])
    doc_count: int = Field(..., description="Number of document chunks in DocumentDB")
    doc_dims: int = Field(..., description="Embedding dimensionality (0 before first insert)")
    demo_dims: int = Field(..., description="Demo vector index dimensionality")
    demo_count: int = Field(..., description="Number of demo vectors in VectorDB")
