"""
Tests for Benchmark and Evaluation API router.
"""
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_get_benchmark_results():
    resp = client.get("/benchmarks/results")
    assert resp.status_code == 200
    data = resp.json()
    assert "hardware" in data
    assert "runs" in data
    assert len(data["runs"]) > 0

    first_run = data["runs"][0]
    assert "dataset" in first_run
    assert "py_build_s" in first_run
    assert "py_query" in first_run
    assert "py_recall" in first_run
    assert "bf" in first_run["py_query"]
    assert "kd" in first_run["py_query"]
    assert "hnsw" in first_run["py_query"]


def test_evaluate_retrieval_endpoint():
    payload = {
        "k": 3,
        "queries": [
            {
                "query_id": "q1",
                "retrieved_ids": [1, 2, 3],
                "ground_truth_ids": [1, 3],
            },
            {
                "query_id": "q2",
                "retrieved_ids": [4, 5, 6],
                "ground_truth_ids": [5],
            },
        ],
    }
    resp = client.post("/benchmarks/evaluate", json=payload)
    assert resp.status_code == 200
    result = resp.json()
    assert result["queries_evaluated"] == 2
    assert result["k"] == 3
    # q1: recall@3 = 2/2 = 1.0; q2: recall@3 = 1/1 = 1.0 -> mean = 1.0
    assert result["mean_recall_at_k"] == 1.0
    # q1: prec@3 = 2/3 = 0.6667; q2: prec@3 = 1/3 = 0.3333 -> mean = 0.5
    assert result["mean_precision_at_k"] == 0.5
    # q1: first rel at rank 1 (1.0); q2: first rel at rank 2 (0.5) -> MRR = (1.0 + 0.5)/2 = 0.75
    assert result["mrr"] == 0.75
