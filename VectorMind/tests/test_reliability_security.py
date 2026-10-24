"""
Task 14 — Quality, Reliability, Edge-case, and Security Tests.

Tests:
    1. Malformed and oversized uploads (413 Payload Too Large, 422 Unprocessable Entity)
    2. Invalid API query parameters (out of bounds k, non-finite vectors)
    3. Unavailable Ollama / DB handling (503 Service Unavailable, meaningful messages)
    4. Partial ingestion rollback (no orphaned chunks on embedding failure)
    5. Authorization boundaries and token tampering (cross-user 403, expired/invalid tokens 401)
    6. Index recovery / rebuilding from persistent store
    7. Secret exposure scan (zero secrets committed or returned in public routes)
"""
from __future__ import annotations

import io
import math
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.database import Base, get_db
from api.main import app
from api.dependencies import get_document_db, get_ollama
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB

# Setup isolated test database
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ── 1. Uploads: Malformed, Empty, and Oversized ───────────────────────────────

def test_upload_empty_file_rejected(client: TestClient):
    # Empty file should return 422 with meaningful error
    files = {"file": ("empty.txt", b"", "text/plain")}
    resp = client.post("/documents/upload", files=files)
    assert resp.status_code == 422
    assert "is empty" in resp.json()["detail"]


def test_upload_unsupported_format_rejected(client: TestClient):
    # Unsupported executable/binary format should return 422
    files = {"file": ("script.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")}
    resp = client.post("/documents/upload", files=files)
    assert resp.status_code == 422
    assert "Unsupported file format" in resp.json()["detail"]


def test_upload_oversized_file_rejected(client: TestClient):
    # Test file exceeding 25MB limit (413 Payload Too Large)
    # Using small override test via mock content size
    from api.services.document_service import ingest_file
    from fastapi import HTTPException, UploadFile
    import asyncio

    # Create dummy upload file of 26 MB
    large_bytes = b"A" * (26 * 1024 * 1024)
    file = UploadFile(filename="oversized.txt", file=io.BytesIO(large_bytes))

    doc_db = DocumentDB()
    ollama = OllamaClient()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(ingest_file(doc_db, ollama, file, max_size_bytes=25 * 1024 * 1024))
    assert exc_info.value.status_code == 413
    assert "exceeds max size" in exc_info.value.detail


# ── 2. Invalid API Parameters and Boundary Validation ─────────────────────────

def test_invalid_vector_search_parameters(client: TestClient):
    # Negative k or k > 1000 should be rejected by Pydantic validation (422)
    bad_k_resp = client.post(
        "/vectors/search",
        json={"embedding": [0.1] * 16, "k": -1, "metric": "cosine", "algo": "hnsw"},
    )
    assert bad_k_resp.status_code == 422

    overflow_k_resp = client.post(
        "/vectors/search",
        json={"embedding": [0.1] * 16, "k": 5000, "metric": "cosine", "algo": "hnsw"},
    )
    assert overflow_k_resp.status_code == 422

    # Invalid algorithm name
    bad_algo = client.post(
        "/vectors/search",
        json={"embedding": [0.1] * 16, "k": 5, "metric": "cosine", "algo": "invalid_algo"},
    )
    assert bad_algo.status_code == 422

    # Non-finite numbers (NaN) in raw JSON payload
    nan_resp = client.post(
        "/vectors/search",
        content='{"embedding": [NaN, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], "k": 5}',
        headers={"Content-Type": "application/json"},
    )
    assert nan_resp.status_code == 422


def test_invalid_rag_parameters(client: TestClient):
    # Empty question
    empty_q = client.post("/rag/ask", json={"question": "", "k": 3})
    assert empty_q.status_code == 422

    # k exceeds bounds (le=20)
    huge_k = client.post("/rag/ask", json={"question": "What is AI?", "k": 100})
    assert huge_k.status_code == 422


# ── 3. Unavailable Ollama / Graceful Degradation ──────────────────────────────

def test_unavailable_ollama_graceful_error(client: TestClient):
    class OfflineOllama(OllamaClient):
        def is_available(self) -> bool:
            return False

    app.dependency_overrides[get_ollama] = lambda: OfflineOllama()
    try:
        # Document search requires Ollama for query embedding
        # When Ollama is offline, returns 503 Service Unavailable with clear actionable error
        resp = client.post(
            "/documents",
            json={"title": "Test Doc", "text": "Some meaningful test content."},
        )
        assert resp.status_code == 503
        assert "Ollama is unavailable" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_ollama, None)


# ── 4. Partial Ingestion Rollback Guarantee ───────────────────────────────────

def test_partial_ingestion_failure_rollback():
    """Verify that if an embedding fails halfway through a multi-chunk document,
    previously inserted chunks are rolled back and not orphaned in DocumentDB."""
    doc_db = DocumentDB()

    class FlakyOllama(OllamaClient):
        def __init__(self):
            super().__init__()
            self.calls = 0

        def is_available(self) -> bool:
            return True

        def embed(self, text: str) -> list[float] | None:
            self.calls += 1
            if self.calls == 1:
                return [0.1] * 16  # first chunk succeeds
            return None  # second chunk fails

    from api.services.document_service import insert_document
    from fastapi import HTTPException

    # Text long enough to produce multiple chunks (e.g. > 300 words)
    long_text = "Word " * 600

    with pytest.raises(HTTPException) as exc_info:
        insert_document(doc_db, FlakyOllama(), title="Multi-Chunk Doc", text=long_text)

    assert exc_info.value.status_code == 502
    # DocumentDB must be empty (the first chunk was rolled back!)
    assert doc_db.size == 0


# ── 5. Security & Authorization Boundaries ────────────────────────────────────

def test_tampered_or_malformed_jwt(client: TestClient):
    # Malformed bearer token
    malformed_resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-valid-token"})
    assert malformed_resp.status_code == 401

    # Missing token
    missing_resp = client.get("/auth/me")
    assert missing_resp.status_code == 401


def test_password_never_exposed_in_auth_or_users_routes(client: TestClient):
    # Register user
    reg_resp = client.post(
        "/auth/register",
        json={"email": "security_test@example.com", "password": "supersecretpassword123"},
    )
    assert reg_resp.status_code == 201
    body = reg_resp.json()

    # Ensure no variation of password exists in response
    assert "password" not in body
    assert "hashed_password" not in body

    token = client.post(
        "/auth/login",
        json={"email": "security_test@example.com", "password": "supersecretpassword123"},
    ).json()["access_token"]

    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    me_body = me_resp.json()
    assert "password" not in me_body
    assert "hashed_password" not in me_body
