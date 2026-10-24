"""
Document service — orchestrates chunking, embedding, DocumentDB, and file ingestion.
"""
from __future__ import annotations

import os
from fastapi import HTTPException, UploadFile

from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.models import DocItem
from ingestion.chunker import chunk_text
from ingestion.extractor import extract_document


def insert_document(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    title: str,
    text: str,
    page_number: int | None = None,
) -> tuple[list[int], int]:
    """
    Chunk ``text``, embed each chunk, store in DocumentDB.

    Returns:
        (chunk_ids, dims)

    Raises:
        HTTPException 503: Ollama unavailable.
        HTTPException 502: Embedding returned None for a chunk.
        HTTPException 422: Dimension mismatch between chunks or empty text.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=422, detail="Document text cannot be empty.")

    if not ollama.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable. Start it with: ollama serve",
        )

    chunks = chunk_text(clean_text)
    if not chunks:
        raise HTTPException(status_code=422, detail="Document produced no chunks.")

    chunk_ids: list[int] = []
    dims: int = 0

    for idx, chunk in enumerate(chunks):
        emb = ollama.embed(chunk)
        if emb is None:
            # Revert any chunks inserted so far for this failed document to prevent partial corruption
            for cid in chunk_ids:
                doc_db.remove(cid)
            raise HTTPException(
                status_code=502,
                detail=f"Ollama failed to embed a chunk of '{title}'.",
            )

        # Dimension consistency guard
        if dims == 0:
            dims = len(emb)
        elif len(emb) != dims:
            for cid in chunk_ids:
                doc_db.remove(cid)
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Embedding dimension mismatch within document: "
                    f"expected {dims}, got {len(emb)}."
                ),
            )

        # DocumentDB dimension consistency with existing chunks
        if doc_db.dims != 0 and len(emb) != doc_db.dims:
            for cid in chunk_ids:
                doc_db.remove(cid)
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Embedding dimension mismatch with existing index: "
                    f"expected {doc_db.dims}, got {len(emb)}."
                ),
            )

        chunk_id = doc_db.insert(
            title=title,
            text=chunk,
            emb=emb,
            page_number=page_number,
            chunk_index=idx,
        )
        chunk_ids.append(chunk_id)

    return chunk_ids, dims or doc_db.dims


async def ingest_file(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    file: UploadFile,
    max_size_bytes: int = 25 * 1024 * 1024,  # 25 MB limit
) -> tuple[str, str, int, list[int], int, int | None]:
    """
    Extract text from uploaded PDF, DOCX, TXT, or MD, chunk, embed, and index.

    Returns:
        (filename, file_type, size_bytes, chunk_ids, dims, pages_detected)
    """
    filename = file.filename or "uploaded_document"
    _, ext = os.path.splitext(filename)
    file_type = ext.lower().lstrip(".") or "unknown"

    content = await file.read()
    size_bytes = len(content)

    if size_bytes == 0:
        raise HTTPException(status_code=422, detail=f"File '{filename}' is empty.")

    if size_bytes > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File '{filename}' exceeds max size of {max_size_bytes // (1024 * 1024)} MB.",
        )

    try:
        sections = extract_document(filename, content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    if not sections:
        raise HTTPException(
            status_code=422,
            detail=f"No readable text could be extracted from '{filename}'.",
        )

    all_chunk_ids: list[int] = []
    final_dims = doc_db.dims
    pages_detected = max((s.page_number for s in sections if s.page_number is not None), default=None)

    for section in sections:
        chunk_ids, dims = insert_document(
            doc_db=doc_db,
            ollama=ollama,
            title=filename,
            text=section.text,
            page_number=section.page_number,
        )
        all_chunk_ids.extend(chunk_ids)
        final_dims = dims

    return filename, file_type, size_bytes, all_chunk_ids, final_dims, pages_detected


def search_documents(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    question: str,
    k: int,
) -> list[tuple[float, DocItem]]:
    """
    Embed the question and return the k most relevant chunks.
    """
    if doc_db.size == 0:
        raise HTTPException(status_code=400, detail="No documents indexed yet.")

    if not ollama.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable. Start it with: ollama serve",
        )

    emb = ollama.embed(question)
    if emb is None:
        raise HTTPException(status_code=502, detail="Ollama failed to embed the question.")

    if doc_db.dims != 0 and len(emb) != doc_db.dims:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Query embedding dimension {len(emb)} does not match "
                f"index dimension {doc_db.dims}."
            ),
        )

    return doc_db.search(emb, k)


def delete_document(doc_db: DocumentDB, id_: int) -> None:
    """
    Remove a chunk by id.
    """
    if not doc_db.remove(id_):
        raise HTTPException(status_code=404, detail=f"Document chunk id={id_} not found.")
