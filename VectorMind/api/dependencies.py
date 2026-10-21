"""
Dependency injection for the VectorMind API.

Provides FastAPI ``Depends``-compatible callables that return the
application-scoped singletons:
    - :class:`~engine.vector_db.VectorDB`      (demo 16-D index)
    - :class:`~engine.document_db.DocumentDB`  (real Ollama embeddings)
    - :class:`~clients.ollama_client.OllamaClient`

All three are created once at startup via the FastAPI lifespan and
stored on ``app.state``.  The ``get_*`` functions retrieve them from
state so that tests can replace them with fakes via ``app.state``.
"""
from __future__ import annotations

from fastapi import Request

from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.vector_db import VectorDB


def get_vector_db(request: Request) -> VectorDB:
    """Return the application-scoped VectorDB singleton."""
    return request.app.state.vector_db


def get_document_db(request: Request) -> DocumentDB:
    """Return the application-scoped DocumentDB singleton."""
    return request.app.state.document_db


def get_ollama(request: Request) -> OllamaClient:
    """Return the application-scoped OllamaClient singleton."""
    return request.app.state.ollama
