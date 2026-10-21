"""
Equivalence tests for the batched distance path (Task 03 optimization).

The batch implementation must be *bit-identical* to the scalar one, otherwise
C++ parity is lost. All comparisons here use exact equality, never tolerances.
Custom wrapper functions are not in the batch registry, so they force the
per-pair fallback and serve as the reference implementation.
"""
from __future__ import annotations

import numpy as np
import pytest

from engine.brute_force import BruteForce
from engine.hnsw import HNSW
from engine.metrics import (
    cosine, euclidean, get_batch_fn, manhattan,
)
from engine.models import VectorItem

METRICS = [euclidean, cosine, manhattan]


def _wrap(fn):
    """Same math, but not registered -> per-pair fallback path."""
    return lambda a, b: fn(a, b)


@pytest.mark.parametrize("fn", METRICS)
@pytest.mark.parametrize("dims", [1, 2, 3, 16, 128, 768])
def test_batch_bit_identical_to_scalar(fn, dims):
    rng = np.random.default_rng(dims)
    m = rng.normal(0, 1, (40, dims)).astype(np.float32)
    m[0] = 0.0                                   # zero-norm row (cosine guard)
    m[1] = rng.normal(0, 1e-6, dims).astype(np.float32)  # tiny norm
    m[2] = m[3]                                  # exact duplicate
    q = rng.normal(0, 1, dims).astype(np.float32)
    for query in (q, np.zeros(dims, np.float32), m[1].copy()):
        got = get_batch_fn(fn)(query, m)
        want = np.array([fn(query, row) for row in m], dtype=np.float32)
        assert got.dtype == np.float32
        assert np.array_equal(got, want), (fn.__name__, dims)


def test_registry_unknown_function_is_none():
    assert get_batch_fn(_wrap(euclidean)) is None


@pytest.mark.parametrize("fn", METRICS)
def test_bruteforce_vectorised_equals_fallback(fn):
    rng = np.random.default_rng(5)
    data = rng.integers(0, 3, (400, 6)).astype(np.float32)   # many exact ties
    fast, slow = BruteForce(), BruteForce()
    for i, row in enumerate(data, 1):
        it = VectorItem(id=i, metadata="m", category="c", emb=row)
        fast.insert(it)
        slow.insert(it)
    for q in rng.integers(0, 3, (30, 6)).astype(np.float32):
        for k in (1, 7, 400, 1000):
            assert fast.knn(q, k, fn) == slow.knn(q, k, _wrap(fn))


def test_bruteforce_cache_invalidated_on_mutation():
    bf = BruteForce()
    for i in range(1, 4):
        bf.insert(VectorItem(i, "m", "c", np.full(2, float(i), np.float32)))
    q = np.zeros(2, np.float32)
    assert [i for _, i in bf.knn(q, 5, euclidean)] == [1, 2, 3]
    bf.insert(VectorItem(9, "m", "c", np.zeros(2, np.float32)))
    assert [i for _, i in bf.knn(q, 5, euclidean)][0] == 9
    bf.remove(9)
    assert [i for _, i in bf.knn(q, 5, euclidean)] == [1, 2, 3]


@pytest.mark.parametrize("fn", METRICS)
def test_hnsw_batch_graph_identical_to_fallback(fn):
    rng = np.random.default_rng(9)
    data = np.concatenate([
        rng.integers(0, 3, (150, 8)).astype(np.float32),     # ties/duplicates
        rng.random((150, 8), dtype=np.float32),
    ])
    fast, slow = HNSW(16, 100), HNSW(16, 100)
    for i, row in enumerate(data, 1):
        it = VectorItem(id=i, metadata="m", category="c", emb=row)
        fast.insert(it, fn)
        slow.insert(it, _wrap(fn))
    assert fast._top_layer == slow._top_layer
    assert fast._entry_pt == slow._entry_pt
    for i in range(1, len(data) + 1):
        assert fast._G[i].max_lyr == slow._G[i].max_lyr
        assert fast._G[i].nbrs == slow._G[i].nbrs
    for q in rng.random((20, 8), dtype=np.float32):
        assert fast.knn(q, 10, 50, fn) == slow.knn(q, 10, 50, _wrap(fn))
