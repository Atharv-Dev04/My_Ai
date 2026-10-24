"""
VectorMind FastAPI application.

Startup:
    - Reads configuration from environment (via Settings).
    - Creates VectorDB, DocumentDB, and OllamaClient singletons on app.state.
    - Pre-loads the 20 canonical demo vectors into VectorDB.
    - Configures CORS for the frontend origins listed in CORS_ORIGINS.

Run locally:
    uvicorn api.main:app --reload --port 8000

OpenAPI docs:
    http://localhost:8000/docs      (Swagger UI)
    http://localhost:8000/redoc     (ReDoc)
    http://localhost:8000/openapi.json
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.routers import auth, benchmarks, conversations, documents, rag, system, vectors
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.vector_db import VectorDB
from ingestion.demo_loader import load_demo


# ---------------------------------------------------------------------------
# Lifespan — create singletons, seed demo data
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup / shutdown.

    Startup:
        - Instantiate VectorDB, DocumentDB, OllamaClient.
        - Seed the 20 demo vectors into VectorDB.
    Shutdown:
        - (nothing required; indexes are in-memory only for Task 02)
    """
    cfg = get_settings()

    vdb = VectorDB(dims=cfg.vector_dims)
    load_demo(vdb)                        # pre-load 20 canonical demo vectors

    doc_db = DocumentDB()

    ollama = OllamaClient(
        host=cfg.ollama_host,
        port=cfg.ollama_port,
        embed_model=cfg.ollama_embed_model,
        gen_model=cfg.ollama_gen_model,
    )

    app.state.vector_db  = vdb
    app.state.document_db = doc_db
    app.state.ollama      = ollama

    yield
    # nothing to tear down (all in-memory)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    cfg = get_settings()

    application = FastAPI(
        title="VectorMind API",
        version="0.1.0",
        description=(
            "REST API for the VectorMind semantic search platform. "
            "Built on a faithful Python port of the "
            "[perryvegehan/Your-OWN-AI](https://github.com/perryvegehan/Your-OWN-AI) "
            "C++ vector engine. Licensed MIT."
        ),
        contact={"name": "VectorMind"},
        license_info={"name": "MIT"},
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ── CORS ─────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────────────────
    application.include_router(system.router)
    application.include_router(auth.router)
    application.include_router(conversations.router)
    application.include_router(vectors.router)
    application.include_router(documents.router)
    application.include_router(rag.router)
    application.include_router(benchmarks.router)

    return application


app = create_app()
