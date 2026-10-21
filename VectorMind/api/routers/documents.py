"""
Documents router — document ingestion, listing, deletion, and semantic search.

Endpoints:
    POST   /documents                insert a document (chunked + embedded)
    GET    /documents                list all chunks
    DELETE /documents/{id}           delete a chunk
    POST   /documents/search         semantic search (no LLM)

All embedding operations go through OllamaClient → DocumentDB.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, status

from api.dependencies import get_document_db, get_ollama
from api.schemas.documents import (
    ContextChunkResponse,
    DocInsertRequest,
    DocInsertResponse,
    DocListItemResponse,
    DocSearchRequest,
    DocSearchResponse,
)
from api.services.document_service import (
    delete_document,
    insert_document,
    search_documents,
)
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB

router = APIRouter(prefix="/documents", tags=["documents"])


# ── POST /documents ───────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=DocInsertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Insert a document",
    description=(
        "Chunk the document text (250 words / 30 overlap), embed each chunk "
        "via Ollama, and store in DocumentDB. "
        "Mirrors C++ ``POST /doc/insert`` (main.cpp:980)."
    ),
)
def insert(
    body: DocInsertRequest,
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> DocInsertResponse:
    chunk_ids, dims = insert_document(doc_db, ollama, body.title, body.text)
    return DocInsertResponse(chunk_ids=chunk_ids, chunks=len(chunk_ids), dims=dims)


# ── GET /documents ────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[DocListItemResponse],
    summary="List all document chunks",
    description=(
        "Return all stored chunks with a 120-character preview. "
        "Mirrors C++ ``GET /doc/list`` (main.cpp:1010)."
    ),
)
def list_documents(
    doc_db: DocumentDB = Depends(get_document_db),
) -> list[DocListItemResponse]:
    return [
        DocListItemResponse(
            id=doc.id,
            title=doc.title,
            preview=doc.text[:120],
            words=len(doc.text.split()),
        )
        for doc in doc_db.all()
    ]


# ── DELETE /documents/{id} ────────────────────────────────────────────────────

@router.delete(
    "/{id_}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document chunk",
    description=(
        "Remove a chunk by id. Returns 404 if not found. "
        "Mirrors C++ ``GET /doc/remove`` (main.cpp:1040)."
    ),
)
def delete(
    id_: int,
    doc_db: DocumentDB = Depends(get_document_db),
) -> None:
    delete_document(doc_db, id_)


# ── POST /documents/search ────────────────────────────────────────────────────

@router.post(
    "/search",
    response_model=DocSearchResponse,
    summary="Semantic document search",
    description=(
        "Embed the question via Ollama and return the k most relevant chunks "
        "without calling the LLM. Mirrors C++ semantic retrieval step."
    ),
)
def search(
    body: DocSearchRequest,
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> DocSearchResponse:
    results = search_documents(doc_db, ollama, body.question, body.k)
    return DocSearchResponse(
        contexts=[
            ContextChunkResponse(
                id=doc.id,
                title=doc.title,
                text=doc.text,
                distance=d,
            )
            for d, doc in results
        ]
    )
