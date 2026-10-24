"""
Documents router — document ingestion, file uploads, listing, deletion, and semantic search.

Endpoints:
    POST   /documents                insert a raw text document (chunked + embedded)
    POST   /documents/upload         upload & ingest PDF, DOCX, TXT, or MD files
    GET    /documents                list all chunks with pagination and source metadata
    DELETE /documents/{id}           delete a chunk
    POST   /documents/search         semantic search (no LLM)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status

from api.dependencies import get_document_db, get_ollama
from api.schemas.documents import (
    ContextChunkResponse,
    DocInsertRequest,
    DocInsertResponse,
    DocListItemResponse,
    DocSearchRequest,
    DocSearchResponse,
    FileIngestResponse,
)
from api.services.document_service import (
    delete_document,
    ingest_file,
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
    summary="Insert a raw text document",
    description=(
        "Chunk the document text (250 words / 30 overlap), embed each chunk "
        "via Ollama, and store in DocumentDB."
    ),
)
def insert(
    body: DocInsertRequest,
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> DocInsertResponse:
    chunk_ids, dims = insert_document(doc_db, ollama, body.title, body.text)
    return DocInsertResponse(chunk_ids=chunk_ids, chunks=len(chunk_ids), dims=dims)


# ── POST /documents/upload ────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=FileIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a file",
    description=(
        "Extract text from a PDF, DOCX, TXT, or Markdown file, chunk according to word boundaries, "
        "generate vector embeddings with Ollama, and index into DocumentDB. "
        "Returns chunk count, IDs, file details, and detected page boundaries."
    ),
)
async def upload_file(
    file: UploadFile = File(...),
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> FileIngestResponse:
    filename, file_type, size_bytes, chunk_ids, dims, pages_detected = await ingest_file(
        doc_db=doc_db,
        ollama=ollama,
        file=file,
    )
    return FileIngestResponse(
        filename=filename,
        file_type=file_type,
        size_bytes=size_bytes,
        chunks_created=len(chunk_ids),
        chunk_ids=chunk_ids,
        dims=dims,
        pages_detected=pages_detected,
    )


# ── GET /documents ────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[DocListItemResponse],
    summary="List all document chunks",
    description=(
        "Return all stored chunks with a 120-character preview, page numbers, and chunk indices."
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
            page_number=getattr(doc, "page_number", None),
            chunk_index=getattr(doc, "chunk_index", 0),
        )
        for doc in doc_db.all()
    ]


# ── DELETE /documents/{id} ────────────────────────────────────────────────────

@router.delete(
    "/{id_}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document chunk",
    description="Remove a chunk by id. Returns 404 if not found.",
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
        "Embed the question via Ollama and return the k most relevant chunks without calling the LLM."
    ),
)
def search(
    body: DocSearchRequest,
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> DocSearchResponse:
    import time
    t0 = time.perf_counter()
    results = search_documents(doc_db, ollama, body.question, body.k)
    t1 = time.perf_counter()
    latency_ms = round((t1 - t0) * 1000.0, 3)

    return DocSearchResponse(
        query=body.question,
        contexts=[
            ContextChunkResponse(
                id=doc.id,
                title=doc.title,
                text=doc.text,
                distance=round(float(d), 5),
                page_number=getattr(doc, "page_number", None),
                chunk_index=getattr(doc, "chunk_index", 0),
            )
            for d, doc in results
        ],
        latency_ms=latency_ms,
        total_chunks_scanned=doc_db.size,
    )
