"""
RAG router — retrieval-augmented generation.

Endpoints:
    POST /rag/ask    retrieve context + generate LLM answer
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.dependencies import get_document_db, get_ollama
from api.schemas.documents import ContextChunkResponse, DocAskRequest, RagAskResponse
from api.services.rag_service import ask
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post(
    "/ask",
    response_model=RagAskResponse,
    summary="Retrieval-augmented question answering",
    description=(
        "Embed the question, retrieve the k most relevant document chunks, "
        "build a prompt, and generate an answer using Ollama. "
        "Mirrors C++ ``POST /doc/ask`` (main.cpp:1000)."
    ),
)
def rag_ask(
    body: DocAskRequest,
    doc_db: DocumentDB = Depends(get_document_db),
    ollama: OllamaClient = Depends(get_ollama),
) -> RagAskResponse:
    answer, contexts = ask(doc_db, ollama, body.question, body.k)
    return RagAskResponse(
        answer=answer,
        model=ollama.gen_model,
        contexts=[
            ContextChunkResponse(
                id=doc.id,
                title=doc.title,
                text=doc.text,
                distance=d,
                page_number=getattr(doc, "page_number", None),
                chunk_index=getattr(doc, "chunk_index", 0),
            )
            for d, doc in contexts
        ],
        doc_count=doc_db.size,
    )
