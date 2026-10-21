"""
API tests for VectorMind FastAPI backend (Task 02).

Strategy:
- Use FastAPI TestClient (synchronous) — no running server needed.
- Ollama is mocked on app.state so no live Ollama process is required.
- VectorDB is pre-seeded with the 20 demo vectors via a fixture.
- DocumentDB is tested with a fake OllamaClient that returns deterministic embeddings.
- Tests cover: valid requests, invalid inputs, dependency failures, HTTP status codes.

Scope (Task 02): engine tests (test_metrics.py etc.) are NOT re-run here;
this suite tests HTTP contracts and API-layer logic only.
"""
from __future__ import annotations

import math
from typing import Optional
from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from clients.ollama_client import OllamaClient
from engine.document_db import DocumentDB
from engine.vector_db import VectorDB
from ingestion.demo_loader import load_demo


# ─────────────────────────────────────────────────────────────────────────────
# Helpers / fakes
# ─────────────────────────────────────────────────────────────────────────────

DIMS = 16

def _demo_query() -> list[float]:
    """Strong CS-category query vector."""
    return [0.90,0.85,0.72,0.68,0.05,0.05,0.05,0.05,
            0.05,0.05,0.05,0.05,0.05,0.05,0.05,0.05]


class _FakeOllamaAvailable:
    """Fake OllamaClient that is always available and returns 8-D embeddings."""
    embed_model = "nomic-embed-text"
    gen_model   = "llama3.2"

    def is_available(self) -> bool:
        return True

    def embed(self, text: str) -> Optional[np.ndarray]:
        # Deterministic: hash the text to a reproducible 8-D unit vector
        seed = abs(hash(text)) % (2**31)
        rng = np.random.default_rng(seed)
        v = rng.random(8).astype(np.float32)
        return v / np.linalg.norm(v)

    def generate(self, prompt: str) -> str:
        return "This is a generated answer."


class _FakeOllamaUnavailable:
    """Fake OllamaClient that is never available."""
    embed_model = "nomic-embed-text"
    gen_model   = "llama3.2"

    def is_available(self) -> bool:
        return False

    def embed(self, text: str) -> Optional[np.ndarray]:
        return None

    def generate(self, prompt: str) -> str:
        return "ERROR: Ollama unavailable. Run: ollama serve"


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
def client_with_demo() -> TestClient:
    """TestClient with demo VectorDB seeded and Ollama available (fake)."""
    app = create_app()
    vdb = VectorDB(dims=DIMS)
    load_demo(vdb)
    app.state.vector_db   = vdb
    app.state.document_db = DocumentDB()
    app.state.ollama      = _FakeOllamaAvailable()
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def client_empty() -> TestClient:
    """TestClient with an empty VectorDB and Ollama available."""
    app = create_app()
    app.state.vector_db   = VectorDB(dims=DIMS)
    app.state.document_db = DocumentDB()
    app.state.ollama      = _FakeOllamaAvailable()
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def client_ollama_down() -> TestClient:
    """TestClient with Ollama unavailable."""
    app = create_app()
    vdb = VectorDB(dims=DIMS)
    load_demo(vdb)
    app.state.vector_db   = vdb
    app.state.document_db = DocumentDB()
    app.state.ollama      = _FakeOllamaUnavailable()
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def client_with_docs() -> TestClient:
    """TestClient with several documents already in DocumentDB."""
    app = create_app()
    fake_ollama = _FakeOllamaAvailable()
    doc_db = DocumentDB()

    # Manually insert 3 chunks (bypass Ollama for speed)
    texts = [
        ("CS Algorithms", "Dynamic programming overlapping subproblems memoization"),
        ("Math Theory",   "Calculus derivatives integrals limits continuity"),
        ("Food Culture",  "Sushi vinegared rice raw fish nori rolls Japan"),
    ]
    for title, text in texts:
        emb = fake_ollama.embed(text)
        doc_db.insert(title, text, emb)

    app.state.vector_db   = VectorDB(dims=DIMS)
    app.state.document_db = doc_db
    app.state.ollama      = fake_ollama
    return TestClient(app, raise_server_exceptions=True)


# ─────────────────────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_status_ok(self, client_with_demo):
        r = client_with_demo.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_version_present(self, client_with_demo):
        r = client_with_demo.get("/health")
        assert "version" in r.json()

    def test_no_auth_required(self, client_empty):
        assert client_empty.get("/health").status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# /status
# ─────────────────────────────────────────────────────────────────────────────

class TestStatus:
    def test_status_fields(self, client_with_demo):
        r = client_with_demo.get("/status")
        assert r.status_code == 200
        data = r.json()
        assert "ollama_available" in data
        assert "embed_model" in data
        assert "gen_model" in data
        assert "doc_count" in data
        assert "demo_count" in data

    def test_demo_count_20(self, client_with_demo):
        r = client_with_demo.get("/status")
        assert r.json()["demo_count"] == 20

    def test_ollama_down_still_200(self, client_ollama_down):
        """Status endpoint must return 200 even when Ollama is down."""
        r = client_ollama_down.get("/status")
        assert r.status_code == 200
        assert r.json()["ollama_available"] is False


# ─────────────────────────────────────────────────────────────────────────────
# GET /vectors
# ─────────────────────────────────────────────────────────────────────────────

class TestListVectors:
    def test_returns_20_demo_items(self, client_with_demo):
        r = client_with_demo.get("/vectors")
        assert r.status_code == 200
        assert len(r.json()) == 20

    def test_item_fields(self, client_with_demo):
        r = client_with_demo.get("/vectors")
        item = r.json()[0]
        assert "id" in item
        assert "metadata" in item
        assert "category" in item
        assert "embedding" in item
        assert len(item["embedding"]) == DIMS

    def test_empty_index_returns_empty_list(self, client_empty):
        r = client_empty.get("/vectors")
        assert r.status_code == 200
        assert r.json() == []


# ─────────────────────────────────────────────────────────────────────────────
# GET /vectors/stats
# ─────────────────────────────────────────────────────────────────────────────

class TestVectorStats:
    def test_count_and_dims(self, client_with_demo):
        r = client_with_demo.get("/vectors/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 20
        assert data["dims"] == DIMS

    def test_algorithms_present(self, client_with_demo):
        data = client_with_demo.get("/vectors/stats").json()
        assert set(data["algorithms"]) == {"hnsw", "kdtree", "bruteforce"}

    def test_metrics_present(self, client_with_demo):
        data = client_with_demo.get("/vectors/stats").json()
        assert set(data["metrics"]) == {"cosine", "euclidean", "manhattan"}


# ─────────────────────────────────────────────────────────────────────────────
# POST /vectors
# ─────────────────────────────────────────────────────────────────────────────

class TestInsertVector:
    def test_insert_returns_201_and_id(self, client_with_demo):
        body = {
            "metadata": "Test vector",
            "category": "test",
            "embedding": [float(i) * 0.1 for i in range(DIMS)],
        }
        r = client_with_demo.post("/vectors", json=body)
        assert r.status_code == 201
        assert isinstance(r.json()["id"], int)
        assert r.json()["id"] == 21   # 20 demo + 1

    def test_insert_increments_count(self, client_empty):
        body = {
            "metadata": "v",
            "category": "c",
            "embedding": [1.0] * DIMS,
        }
        client_empty.post("/vectors", json=body)
        count = client_empty.get("/vectors/stats").json()["count"]
        assert count == 1

    def test_insert_wrong_dims_returns_422(self, client_with_demo):
        body = {
            "metadata": "bad",
            "category": "test",
            "embedding": [1.0] * 8,   # wrong: index expects 16
        }
        r = client_with_demo.post("/vectors", json=body)
        assert r.status_code == 422

    def test_insert_empty_embedding_returns_422(self, client_with_demo):
        body = {"metadata": "x", "category": "y", "embedding": []}
        r = client_with_demo.post("/vectors", json=body)
        assert r.status_code == 422

    def test_insert_non_finite_in_embedding_returns_422(self, client_with_demo):
        # Send a string value inside the embedding array — Pydantic will reject it
        # with a 422 because the field type is list[float], not list[Any].
        # This avoids httpx/json serialisation issues with float("nan")/float("inf").
        raw = '{"metadata":"bad","category":"test","embedding":[0.0' + ",0.0" * (DIMS - 2) + ',"NaN"]}'
        r = client_with_demo.post(
            "/vectors",
            content=raw,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 422


    def test_insert_missing_fields_returns_422(self, client_with_demo):
        r = client_with_demo.post("/vectors", json={"metadata": "x"})
        assert r.status_code == 422

    def test_first_insert_into_empty_sets_dims(self, client_empty):
        body = {"metadata": "m", "category": "c", "embedding": [0.5] * DIMS}
        r = client_empty.post("/vectors", json=body)
        assert r.status_code == 201
        stats = client_empty.get("/vectors/stats").json()
        assert stats["dims"] == DIMS


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /vectors/{id}
# ─────────────────────────────────────────────────────────────────────────────

class TestDeleteVector:
    def test_delete_existing_returns_204(self, client_with_demo):
        r = client_with_demo.delete("/vectors/1")
        assert r.status_code == 204

    def test_delete_decrements_count(self, client_with_demo):
        client_with_demo.delete("/vectors/1")
        count = client_with_demo.get("/vectors/stats").json()["count"]
        assert count == 19

    def test_delete_nonexistent_returns_404(self, client_with_demo):
        r = client_with_demo.delete("/vectors/9999")
        assert r.status_code == 404

    def test_delete_twice_returns_404(self, client_with_demo):
        client_with_demo.delete("/vectors/1")
        r = client_with_demo.delete("/vectors/1")
        assert r.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# POST /vectors/search
# ─────────────────────────────────────────────────────────────────────────────

class TestVectorSearch:
    def test_search_returns_200(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "cosine", "algo": "hnsw"}
        r = client_with_demo.post("/vectors/search", json=body)
        assert r.status_code == 200

    def test_search_result_count(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "cosine", "algo": "hnsw"}
        data = client_with_demo.post("/vectors/search", json=body).json()
        assert len(data["results"]) == 5

    def test_search_result_fields(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 1, "metric": "cosine", "algo": "bruteforce"}
        hit = client_with_demo.post("/vectors/search", json=body).json()["results"][0]
        assert "id" in hit
        assert "metadata" in hit
        assert "category" in hit
        assert "distance" in hit
        assert "embedding" in hit

    def test_search_top1_is_cs_category(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 1, "metric": "cosine", "algo": "bruteforce"}
        hit = client_with_demo.post("/vectors/search", json=body).json()["results"][0]
        assert hit["category"] == "cs"

    @pytest.mark.parametrize("algo", ["bruteforce", "kdtree", "hnsw"])
    def test_search_all_algos(self, client_with_demo, algo):
        body = {"embedding": _demo_query(), "k": 3, "metric": "cosine", "algo": algo}
        r = client_with_demo.post("/vectors/search", json=body)
        assert r.status_code == 200
        assert len(r.json()["results"]) == 3

    @pytest.mark.parametrize("metric", ["cosine", "euclidean", "manhattan"])
    def test_search_all_metrics(self, client_with_demo, metric):
        body = {"embedding": _demo_query(), "k": 3, "metric": metric, "algo": "bruteforce"}
        r = client_with_demo.post("/vectors/search", json=body)
        assert r.status_code == 200

    def test_search_empty_index_returns_400(self, client_empty):
        body = {"embedding": [1.0] * DIMS, "k": 5}
        r = client_empty.post("/vectors/search", json=body)
        assert r.status_code == 400

    def test_search_wrong_dims_returns_422(self, client_with_demo):
        body = {"embedding": [1.0] * 8, "k": 5}
        r = client_with_demo.post("/vectors/search", json=body)
        assert r.status_code == 422

    def test_search_latency_us_present(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5}
        data = client_with_demo.post("/vectors/search", json=body).json()
        assert data["latency_us"] >= 0.0

    def test_search_invalid_metric_returns_422(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "l3_norm"}
        r = client_with_demo.post("/vectors/search", json=body)
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# POST /vectors/benchmark
# ─────────────────────────────────────────────────────────────────────────────

class TestVectorBenchmark:
    def test_benchmark_returns_200(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "cosine"}
        r = client_with_demo.post("/vectors/benchmark", json=body)
        assert r.status_code == 200

    def test_benchmark_fields_non_negative(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "cosine"}
        data = client_with_demo.post("/vectors/benchmark", json=body).json()
        assert data["bruteforce_us"] >= 0
        assert data["kdtree_us"] >= 0
        assert data["hnsw_us"] >= 0

    def test_benchmark_item_count(self, client_with_demo):
        body = {"embedding": _demo_query(), "k": 5, "metric": "cosine"}
        data = client_with_demo.post("/vectors/benchmark", json=body).json()
        assert data["item_count"] == 20

    def test_benchmark_empty_index_returns_400(self, client_empty):
        body = {"embedding": [1.0] * DIMS, "k": 5}
        r = client_empty.post("/vectors/benchmark", json=body)
        assert r.status_code == 400

    def test_benchmark_wrong_dims_returns_422(self, client_with_demo):
        body = {"embedding": [1.0] * 4, "k": 5}
        r = client_with_demo.post("/vectors/benchmark", json=body)
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# GET /vectors/hnsw-info
# ─────────────────────────────────────────────────────────────────────────────

class TestHNSWInfo:
    def test_returns_200(self, client_with_demo):
        r = client_with_demo.get("/vectors/hnsw-info")
        assert r.status_code == 200

    def test_node_count_20(self, client_with_demo):
        data = client_with_demo.get("/vectors/hnsw-info").json()
        assert data["node_count"] == 20

    def test_layer0_has_all_nodes(self, client_with_demo):
        data = client_with_demo.get("/vectors/hnsw-info").json()
        assert data["nodes_per_layer"][0] == 20

    def test_nodes_list_length(self, client_with_demo):
        data = client_with_demo.get("/vectors/hnsw-info").json()
        assert len(data["nodes"]) == 20

    def test_node_fields(self, client_with_demo):
        node = client_with_demo.get("/vectors/hnsw-info").json()["nodes"][0]
        assert "id" in node
        assert "metadata" in node
        assert "category" in node
        assert "max_layer" in node


# ─────────────────────────────────────────────────────────────────────────────
# POST /vectors/load-demo
# ─────────────────────────────────────────────────────────────────────────────

class TestLoadDemo:
    def test_load_demo_into_empty_index(self, client_empty):
        r = client_empty.post("/vectors/load-demo")
        assert r.status_code == 200
        assert client_empty.get("/vectors/stats").json()["count"] == 20

    def test_load_demo_when_already_seeded_returns_409(self, client_with_demo):
        r = client_with_demo.post("/vectors/load-demo")
        assert r.status_code == 409


# ─────────────────────────────────────────────────────────────────────────────
# GET /documents
# ─────────────────────────────────────────────────────────────────────────────

class TestListDocuments:
    def test_empty_returns_empty_list(self, client_with_demo):
        r = client_with_demo.get("/documents")
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_docs_after_insert(self, client_with_docs):
        r = client_with_docs.get("/documents")
        assert r.status_code == 200
        assert len(r.json()) == 3

    def test_item_fields(self, client_with_docs):
        item = client_with_docs.get("/documents").json()[0]
        assert "id" in item
        assert "title" in item
        assert "preview" in item
        assert "words" in item


# ─────────────────────────────────────────────────────────────────────────────
# POST /documents
# ─────────────────────────────────────────────────────────────────────────────

class TestInsertDocument:
    def test_insert_returns_201(self, client_with_demo):
        body = {"title": "Test Doc", "text": "Hello world this is a test document for insertion."}
        r = client_with_demo.post("/documents", json=body)
        assert r.status_code == 201

    def test_insert_returns_chunk_ids(self, client_with_demo):
        body = {"title": "Test Doc", "text": "Short text."}
        data = client_with_demo.post("/documents", json=body).json()
        assert isinstance(data["chunk_ids"], list)
        assert data["chunks"] == len(data["chunk_ids"])

    def test_insert_missing_title_returns_422(self, client_with_demo):
        r = client_with_demo.post("/documents", json={"text": "some text"})
        assert r.status_code == 422

    def test_insert_empty_title_returns_422(self, client_with_demo):
        r = client_with_demo.post("/documents", json={"title": "", "text": "some text"})
        assert r.status_code == 422

    def test_insert_empty_text_returns_422(self, client_with_demo):
        r = client_with_demo.post("/documents", json={"title": "T", "text": ""})
        assert r.status_code == 422

    def test_insert_ollama_down_returns_503(self, client_ollama_down):
        body = {"title": "Test", "text": "Some content here."}
        r = client_ollama_down.post("/documents", json=body)
        assert r.status_code == 503


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /documents/{id}
# ─────────────────────────────────────────────────────────────────────────────

class TestDeleteDocument:
    def test_delete_existing_returns_204(self, client_with_docs):
        ids = [d["id"] for d in client_with_docs.get("/documents").json()]
        r = client_with_docs.delete(f"/documents/{ids[0]}")
        assert r.status_code == 204

    def test_delete_decrements_count(self, client_with_docs):
        ids = [d["id"] for d in client_with_docs.get("/documents").json()]
        client_with_docs.delete(f"/documents/{ids[0]}")
        assert len(client_with_docs.get("/documents").json()) == 2

    def test_delete_nonexistent_returns_404(self, client_with_docs):
        r = client_with_docs.delete("/documents/99999")
        assert r.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# POST /documents/search
# ─────────────────────────────────────────────────────────────────────────────

class TestDocumentSearch:
    def test_search_returns_200(self, client_with_docs):
        r = client_with_docs.post("/documents/search",
                                  json={"question": "dynamic programming", "k": 2})
        assert r.status_code == 200

    def test_search_returns_contexts(self, client_with_docs):
        data = client_with_docs.post("/documents/search",
                                     json={"question": "algorithms", "k": 3}).json()
        assert "contexts" in data

    def test_search_empty_db_returns_400(self, client_with_demo):
        r = client_with_demo.post("/documents/search",
                                  json={"question": "test", "k": 2})
        assert r.status_code == 400

    def test_search_ollama_down_returns_503(self, client_ollama_down):
        # DocumentDB is empty in this fixture too, so 400 not 503
        # Inject some docs manually
        app = client_ollama_down.app
        emb = np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
        app.state.document_db.insert("t", "some text", emb)
        r = client_ollama_down.post("/documents/search",
                                    json={"question": "text", "k": 1})
        assert r.status_code == 503

    def test_search_empty_question_returns_422(self, client_with_docs):
        r = client_with_docs.post("/documents/search", json={"question": "", "k": 1})
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# POST /rag/ask
# ─────────────────────────────────────────────────────────────────────────────

class TestRagAsk:
    def test_ask_returns_200(self, client_with_docs):
        r = client_with_docs.post("/rag/ask",
                                  json={"question": "What is sushi?", "k": 2})
        assert r.status_code == 200

    def test_ask_response_fields(self, client_with_docs):
        data = client_with_docs.post("/rag/ask",
                                     json={"question": "What is sushi?", "k": 2}).json()
        assert "answer" in data
        assert "model" in data
        assert "contexts" in data
        assert "doc_count" in data

    def test_ask_answer_is_string(self, client_with_docs):
        data = client_with_docs.post("/rag/ask",
                                     json={"question": "algorithms", "k": 1}).json()
        assert isinstance(data["answer"], str)
        assert len(data["answer"]) > 0

    def test_ask_model_name(self, client_with_docs):
        data = client_with_docs.post("/rag/ask",
                                     json={"question": "test", "k": 1}).json()
        assert data["model"] == "llama3.2"

    def test_ask_empty_db_returns_400(self, client_with_demo):
        r = client_with_demo.post("/rag/ask",
                                  json={"question": "test", "k": 1})
        assert r.status_code == 400

    def test_ask_ollama_down_returns_503(self, client_ollama_down):
        # Inject a doc so we get past the empty-DB check
        emb = np.array([1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0], dtype=np.float32)
        client_ollama_down.app.state.document_db.insert("t", "text", emb)
        r = client_ollama_down.post("/rag/ask", json={"question": "test", "k": 1})
        assert r.status_code == 503

    def test_ask_invalid_k_returns_422(self, client_with_docs):
        r = client_with_docs.post("/rag/ask",
                                  json={"question": "test", "k": 0})
        assert r.status_code == 422

    def test_ask_empty_question_returns_422(self, client_with_docs):
        r = client_with_docs.post("/rag/ask", json={"question": "", "k": 1})
        assert r.status_code == 422
