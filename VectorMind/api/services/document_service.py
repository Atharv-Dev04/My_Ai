"""
Document service — orchestrates chunking, embedding, and DocumentDB.
"""
from __future__ import annotations

from fastapi import HTTPException

from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.models import DocItem
from ingestion.chunker import chunk_text


def insert_document(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    title: str,
    text: str,
) -> tuple[list[int], int]:
    """
    Chunk ``text``, embed each chunk, store in DocumentDB.

    Returns:
        (chunk_ids, dims)

    Raises:
        HTTPException 503: Ollama unavailable.
        HTTPException 502: Embedding returned None for a chunk.
        HTTPException 422: Dimension mismatch between chunks.
    """
    if not ollama.is_available():
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable. Start it with: ollama serve",
        )

    chunks = chunk_text(text)
    chunk_ids: list[int] = []
    dims: int = 0

    for chunk in chunks:
        emb = ollama.embed(chunk)
        if emb is None:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama failed to embed a chunk of '{title}'.",
            )

        # Dimension consistency guard
        if dims == 0:
            dims = len(emb)
        elif len(emb) != dims:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Embedding dimension mismatch within document: "
                    f"expected {dims}, got {len(emb)}."
                ),
            )

        # DocumentDB dimension consistency with existing chunks
        if doc_db.dims != 0 and len(emb) != doc_db.dims:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Embedding dimension mismatch with existing index: "
                    f"expected {doc_db.dims}, got {len(emb)}."
                ),
            )

        chunk_id = doc_db.insert(title, chunk, emb)
        chunk_ids.append(chunk_id)

    if not chunk_ids:
        raise HTTPException(status_code=422, detail="Document produced no chunks.")

    return chunk_ids, dims or doc_db.dims


def search_documents(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    question: str,
    k: int,
) -> list[tuple[float, DocItem]]:
    """
    Embed the question and return the k most relevant chunks.

    Raises:
        HTTPException 503: Ollama unavailable.
        HTTPException 502: Embedding failed.
        HTTPException 400: No documents indexed.
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

    Raises:
        HTTPException 404: id not found.
    """
    if not doc_db.remove(id_):
        raise HTTPException(status_code=404, detail=f"Document chunk id={id_} not found.")
