"""
Task 03 regression tests: C++ parity, RNG exactness, ties, edge cases.

C++ parity tests are skipped (not failed) if the reference harness has not
been built; see benchmarks/cpp_reference/harness.cpp for the build command.
"""
from __future__ import annotations

import numpy as np
import pytest

from benchmarks import cppref as c
from engine._mt19937 import Mt19937
from engine.brute_force import BruteForce
from engine.hnsw import HNSW
from engine.kdtree import KDTree
from engine.metrics import euclidean, manhattan
from engine.models import VectorItem


def _item(i, v):
    return VectorItem(id=i, metadata="m", category="c",
                      emb=np.asarray(v, dtype=np.float32))


# ── RNG ─────────────────────────────────────────────────────────────────────

class TestMt19937:
    def test_standard_10000th_output(self):
        # C++11 standard [rand.predef]: mt19937 default-seeded 10000th = 4123659995
        r = Mt19937(5489)
        for _ in range(9999):
            r.next_u32()
        assert r.next_u32() == 4123659995

    def test_uniform_in_unit_interval(self):
        r = Mt19937(42)
        vals = [r.uniform_float() for _ in range(5000)]
        assert all(0.0 <= v < 1.0 for v in vals)


# ── edge cases ──────────────────────────────────────────────────────────────

class TestKDTreeEdgeCases:
    def test_k_zero_returns_empty(self):
        kd = KDTree(2)
        kd.insert(_item(1, [0, 0]))
        assert kd.knn(np.zeros(2, np.float32), 0, euclidean) == []

    def test_degenerate_deep_tree_no_recursion_error(self):
        kd = KDTree(2)
        for i in range(1, 3001):          # identical points -> depth == N
            kd.insert(_item(i, [1.0, 1.0]))
        res = kd.knn(np.zeros(2, np.float32), 5, euclidean)
        assert [i for _, i in res] == [1, 2, 3, 4, 5]

    def test_matches_bruteforce_with_ties(self):
        rng = np.random.default_rng(7)
        data = rng.integers(0, 3, size=(300, 4)).astype(np.float32)
        bf, kd = BruteForce(), KDTree(4)
        for i, row in enumerate(data, 1):
            it = _item(i, row)
            bf.insert(it)
            kd.insert(it)
        for q in rng.integers(0, 3, size=(40, 4)).astype(np.float32):
            for fn in (euclidean, manhattan):
                # Distances must equal exact ground truth. Ids at the k-th
                # tie boundary are unspecified in the original KD-Tree
                # (strict '<' admission/pruning); id parity with the C++
                # KD-Tree is asserted in test_cpp_parity instead.
                assert [d for d, _ in kd.knn(q, 10, fn)] == \
                    [d for d, _ in bf.knn(q, 10, fn)]


class TestHNSWEdgeCases:
    def test_k_larger_than_n(self):
        h = HNSW()
        for i in range(1, 4):
            h.insert(_item(i, [float(i), 0.0]), euclidean)
        assert len(h.knn(np.zeros(2, np.float32), 10, 50, euclidean)) == 3

    def test_empty(self):
        assert HNSW().knn(np.zeros(2, np.float32), 3, 50, euclidean) == []

    def test_deterministic_levels(self):
        def lv():
            h = HNSW()
            for i in range(1, 200):
                h.insert(_item(i, [float(i), 0.0]), euclidean)
            return [h._G[i].max_lyr for i in range(1, 200)]
        assert lv() == lv()


# ── C++ parity ──────────────────────────────────────────────────────────────

needs_cpp = pytest.mark.skipif(not c.HARNESS.exists(),
                               reason="C++ reference harness not built")


@needs_cpp
@pytest.mark.parametrize("dataset", ["uniform", "clustered", "grid_ties"])
@pytest.mark.parametrize("metric", ["euclidean", "manhattan", "cosine"])
def test_cpp_parity(dataset, metric, tmp_path):
    data = c.DATASETS[dataset](300, 8, seed=3)
    qs = c.DATASETS[dataset](30, 8, seed=4)
    cpp = c.run_cpp(data, qs, metric, 10, 50, tmp_path)
    py = c.run_python(data, qs, metric, 10, 50)
    r = c.compare(py, cpp)
    assert r["levels_equal"] and r["top_equal"] and r["entry_equal"]
    for algo in ("bf", "kd", "hnsw"):
        assert r[algo]["id_list_mismatch"] == 0, (algo, r[algo])
        assert r[algo]["dist_mismatch"] == 0, (algo, r[algo])
    assert r["nbr_lists_mismatch"] == 0
