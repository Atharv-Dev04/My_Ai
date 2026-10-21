"""
RAG service — retrieval-augmented generation orchestration.

Mirrors C++ ``/doc/ask`` handler (main.cpp:1000–1060).
"""
from __future__ import annotations

from fastapi import HTTPException

from api.services.document_service import search_documents
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.models import DocItem


_PROMPT_TEMPLATE = """\
You are a helpful assistant. Use ONLY the context below to answer the question.
If the answer is not in the context, say "I don't have enough information."

Context:
{context}

Question: {question}

Answer:"""


def ask(
    doc_db: DocumentDB,
    ollama: OllamaClient,
    question: str,
    k: int,
) -> tuple[str, list[tuple[float, DocItem]]]:
    """
    Retrieve the top-k relevant chunks, build a prompt, and generate an answer.

    Returns:
        (answer_text, contexts)

    Raises:
        HTTPException 503: Ollama unavailable (raised by search_documents).
        HTTPException 400: No documents indexed.
        HTTPException 502: Embedding or generation failure.
    """
    # Step 1: semantic retrieval (delegates availability/dim checks)
    contexts = search_documents(doc_db, ollama, question, k)

    if not contexts:
        # No relevant chunks found within max_dist — generate without context
        context_text = "(no relevant context found)"
    else:
        context_text = "\n\n---\n\n".join(
            f"[{doc.title}]\n{doc.text}" for _, doc in contexts
        )

    # Step 2: build prompt and generate
    prompt = _PROMPT_TEMPLATE.format(context=context_text, question=question)
    answer = ollama.generate(prompt)

    if answer.startswith("ERROR:"):
        raise HTTPException(
            status_code=503,
            detail="Ollama generation failed. Ensure Ollama is running with: ollama serve",
        )

    return answer, contexts
