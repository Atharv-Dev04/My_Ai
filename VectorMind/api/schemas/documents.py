"""
Pydantic schemas for document and RAG endpoints.

Mirrors C++ ``/doc/*`` routes (main.cpp:980–1060).
"""
from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


# ── Requests ──────────────────────────────────────────────────────────────────

class DocInsertRequest(BaseModel):
    """
    Body for POST /documents.

    C++ equivalent: POST /doc/insert ``{title, text}``.
    Ollama embedding is performed server-side.
    """

    title: str = Field(..., min_length=1, max_length=512, examples=["My Document"])
    text: str = Field(
        ...,
        min_length=1,
        max_length=200_000,
        description="Full document text. Chunked server-side (250 words / 30 overlap).",
        examples=["Dynamic programming is an algorithmic technique..."],
    )


class DocAskRequest(BaseModel):
    """
    Body for POST /rag/ask.

    C++ equivalent: POST /doc/ask ``{question, k}``.
    """

    question: str = Field(..., min_length=1, max_length=2048, examples=["What is dynamic programming?"])
    k: Annotated[int, Field(ge=1, le=20)] = Field(3, description="Number of context chunks to retrieve")


class DocSearchRequest(BaseModel):
    """Body for POST /documents/search — semantic search without LLM."""

    question: str = Field(..., min_length=1, max_length=2048)
    k: Annotated[int, Field(ge=1, le=20)] = 3


# ── Responses ─────────────────────────────────────────────────────────────────

class DocInsertResponse(BaseModel):
    """Response for POST /documents."""

    chunk_ids: list[int] = Field(..., description="IDs assigned to each chunk")
    chunks: int = Field(..., description="Number of chunks created")
    dims: int = Field(..., description="Embedding dimensionality")


class DocListItemResponse(BaseModel):
    """One document chunk in GET /documents."""

    id: int
    title: str
    preview: str = Field(..., description="First 120 characters of the chunk text")
    words: int
    page_number: int | None = Field(None, description="Physical page number where available")
    chunk_index: int = Field(0, description="Chunk index within source document")


class ContextChunkResponse(BaseModel):
    """One retrieved context chunk."""

    id: int
    title: str
    text: str
    distance: float
    page_number: int | None = None
    chunk_index: int = 0


class DocSearchResponse(BaseModel):
    """Response for POST /documents/search."""

    contexts: list[ContextChunkResponse]


class RagAskResponse(BaseModel):
    """
    Response for POST /rag/ask.

    C++ equivalent: POST /doc/ask response.
    """

    answer: str
    model: str
    contexts: list[ContextChunkResponse]
    doc_count: int


class FileIngestResponse(BaseModel):
    """Response for POST /documents/upload."""

    filename: str
    file_type: str
    size_bytes: int
    chunks_created: int
    chunk_ids: list[int]
    dims: int
    pages_detected: int | None = None
