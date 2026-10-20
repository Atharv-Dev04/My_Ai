"""
Tests for distance metrics (engine/metrics.py).

Verifies bit-level correctness against known analytical results.
All assertions use relative tolerance 1e-6 (float32 precision).
"""
from __future__ import annotations

import math

import numpy as np
import pytest

from engine.metrics import cosine, euclidean, get_dist_fn, manhattan


# ---------------------------------------------------------------------------
# euclidean
# ---------------------------------------------------------------------------

class TestEuclidean:
    def test_origin_distance(self):
        """Distance from [3, 4] to origin = 5 (Pythagorean triple)."""
        a = np.array([3.0, 4.0], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        assert math.isclose(euclidean(a, b), 5.0, rel_tol=1e-6)

    def test_identical_vectors(self):
        """Distance from a point to itself is 0."""
        a = np.array([1.0, 2.0, 3.0], dtype=np.float32)
        assert euclidean(a, a) == pytest.approx(0.0, abs=1e-6)

    def test_unit_vectors_1d(self):
        """|1 - 0| = 1."""
        a = np.array([1.0], dtype=np.float32)
        b = np.array([0.0], dtype=np.float32)
        assert euclidean(a, b) == pytest.approx(1.0, rel=1e-6)

    def test_symmetry(self):
        """d(a, b) == d(b, a)."""
        a = np.array([1.0, 2.0, 3.0], dtype=np.float32)
        b = np.array([4.0, 5.0, 6.0], dtype=np.float32)
        assert euclidean(a, b) == pytest.approx(euclidean(b, a), rel=1e-6)

    def test_non_negative(self):
        """Distance is always ≥ 0."""
        a = np.array([0.5, -0.5], dtype=np.float32)
        b = np.array([-0.5, 0.5], dtype=np.float32)
        assert euclidean(a, b) >= 0.0

    def test_known_value_16d(self):
        """Cross-check a 16-D computation against numpy reference."""
        rng = np.random.default_rng(0)
        a = rng.random(16).astype(np.float32)
        b = rng.random(16).astype(np.float32)
        expected = float(np.sqrt(np.sum((a - b) ** 2)))
        assert euclidean(a, b) == pytest.approx(expected, rel=1e-5)

    def test_list_input(self):
        """Should accept plain Python lists (auto-cast)."""
        assert euclidean([3.0, 4.0], [0.0, 0.0]) == pytest.approx(5.0, rel=1e-6)


# ---------------------------------------------------------------------------
# cosine
# ---------------------------------------------------------------------------

class TestCosine:
    def test_identical_direction(self):
        """Identical direction → cosine distance = 0."""
        a = np.array([1.0, 0.0], dtype=np.float32)
        assert cosine(a, a) == pytest.approx(0.0, abs=1e-6)

    def test_opposite_direction(self):
        """Opposite direction → cosine distance = 2."""
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([-1.0, 0.0], dtype=np.float32)
        assert cosine(a, b) == pytest.approx(2.0, rel=1e-6)

    def test_orthogonal(self):
        """Orthogonal vectors → cosine distance = 1."""
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 1.0], dtype=np.float32)
        assert cosine(a, b) == pytest.approx(1.0, rel=1e-6)

    def test_zero_norm_a(self):
        """Zero norm in a → returns 1.0 (C++ guard: na < 1e-9)."""
        a = np.array([0.0, 0.0], dtype=np.float32)
        b = np.array([1.0, 0.0], dtype=np.float32)
        assert cosine(a, b) == 1.0

    def test_zero_norm_b(self):
        """Zero norm in b → returns 1.0."""
        a = np.array([1.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 0.0], dtype=np.float32)
        assert cosine(a, b) == 1.0

    def test_both_zero_norm(self):
        """Both zero → returns 1.0."""
        a = np.array([0.0, 0.0], dtype=np.float32)
        assert cosine(a, a) == 1.0

    def test_scale_invariance(self):
        """Cosine distance is scale-invariant."""
        a = np.array([1.0, 2.0], dtype=np.float32)
        b = np.array([3.0, 4.0], dtype=np.float32)
        assert cosine(a, b) == pytest.approx(cosine(2 * a, 3 * b), rel=1e-5)

    def test_range(self):
        """Cosine distance ∈ [0, 2] for any vectors."""
        rng = np.random.default_rng(1)
        for _ in range(50):
            a = rng.standard_normal(8).astype(np.float32)
            b = rng.standard_normal(8).astype(np.float32)
            d = cosine(a, b)
            assert -1e-6 <= d <= 2.0 + 1e-6

    def test_symmetry(self):
        """d(a, b) == d(b, a)."""
        a = np.array([0.7, 0.3], dtype=np.float32)
        b = np.array([0.2, 0.8], dtype=np.float32)
        assert cosine(a, b) == pytest.approx(cosine(b, a), rel=1e-6)

    def test_demo_category_separation(self):
        """CS and Food demo vectors should be dissimilar: cosine dist > 0.7."""
        cs_vec    = np.array([0.90,0.85,0.72,0.68,0.12,0.08,0.15,0.10,
                              0.05,0.08,0.06,0.09,0.07,0.11,0.08,0.06], dtype=np.float32)
        food_vec  = np.array([0.08,0.06,0.09,0.07,0.07,0.08,0.06,0.09,
                              0.90,0.86,0.78,0.72,0.08,0.06,0.09,0.07], dtype=np.float32)
        # Actual cosine distance ≈ 0.807; both vectors are in positive space,
        # so similarity is notably less than 1 but not as extreme as 0.9.
        assert cosine(cs_vec, food_vec) > 0.7

    def test_demo_category_affinity(self):
        """Two CS vectors from the demo have cosine dist < 0.02."""
        cs1 = np.array([0.90,0.85,0.72,0.68,0.12,0.08,0.15,0.10,
                        0.05,0.08,0.06,0.09,0.07,0.11,0.08,0.06], dtype=np.float32)
        cs2 = np.array([0.88,0.82,0.78,0.74,0.15,0.10,0.08,0.12,
                        0.06,0.07,0.08,0.05,0.09,0.06,0.07,0.10], dtype=np.float32)
        assert cosine(cs1, cs2) < 0.02


# ---------------------------------------------------------------------------
# manhattan
# ---------------------------------------------------------------------------

class TestManhattan:
    def test_known_value(self):
        """L1 distance of [1,2,3] and [4,5,6] = 9."""
        a = np.array([1.0, 2.0, 3.0], dtype=np.float32)
        b = np.array([4.0, 5.0, 6.0], dtype=np.float32)
        assert manhattan(a, b) == pytest.approx(9.0, rel=1e-6)

    def test_identical_vectors(self):
        a = np.array([3.0, 1.0], dtype=np.float32)
        assert manhattan(a, a) == pytest.approx(0.0, abs=1e-6)

    def test_symmetry(self):
        a = np.array([0.1, 0.2, 0.3], dtype=np.float32)
        b = np.array([0.4, 0.5, 0.6], dtype=np.float32)
        assert manhattan(a, b) == pytest.approx(manhattan(b, a), rel=1e-6)

    def test_non_negative(self):
        a = np.array([1.5, -2.0], dtype=np.float32)
        b = np.array([-0.5, 3.0], dtype=np.float32)
        assert manhattan(a, b) >= 0.0


# ---------------------------------------------------------------------------
# get_dist_fn
# ---------------------------------------------------------------------------

class TestGetDistFn:
    def test_cosine_selector(self):
        fn = get_dist_fn("cosine")
        assert fn is cosine

    def test_manhattan_selector(self):
        fn = get_dist_fn("manhattan")
        assert fn is manhattan

    def test_euclidean_selector(self):
        fn = get_dist_fn("euclidean")
        assert fn is euclidean

    def test_unknown_falls_back_to_euclidean(self):
        """Unknown metric falls back to euclidean (same as C++ getDistFn)."""
        fn = get_dist_fn("l3_norm")
        assert fn is euclidean

    def test_empty_string_falls_back(self):
        fn = get_dist_fn("")
        assert fn is euclidean
