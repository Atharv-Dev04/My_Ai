"""
Distance / similarity metrics.

Faithful Python port of C++ metric functions (main.cpp:39–64).

All functions:
  - Accept 1-D numpy arrays (or array-like, auto-cast to float32).
  - Return a Python float.
  - Behave identically to the C++ originals for all well-formed inputs.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

from typing import Callable

import numpy as np

# Type alias mirroring C++ ``using DistFn`` (main.cpp:33)
DistFn = Callable[[np.ndarray, np.ndarray], float]

_EPS32 = np.float32(1e-9)   # C++ literal ``1e-9f``


def _seq_sum(x: np.ndarray) -> np.float32:
    """
    Left-to-right float32 sum, like the C++ ``float s=0; s += ...`` loops.

    ``np.dot``/``np.sum`` use SIMD/pairwise accumulation whose rounding
    differs from C++ in the last ulps, which can reorder near-ties.
    ``cumsum`` accumulates strictly sequentially in float32.
    """
    if x.size == 0:
        return np.float32(0.0)
    return x.cumsum(dtype=np.float32)[-1]


def euclidean(a: np.ndarray, b: np.ndarray) -> float:
    """
    Euclidean (L2) distance.

    Port of C++ ``euclidean`` (main.cpp:39–43)::

        sqrt(sum((a_i - b_i)^2))

    Args:
        a: 1-D float32 array.
        b: 1-D float32 array of the same length as ``a``.

    Returns:
        Non-negative float distance.
    """
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    diff = a - b
    return float(np.sqrt(_seq_sum(diff * diff)))


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    """
    Cosine *distance* (1 − cosine similarity), range [0, 2].

    Port of C++ ``cosine`` (main.cpp:45–52)::

        1 - dot(a,b) / (‖a‖ · ‖b‖)

    Returns ``1.0`` if either vector has near-zero L2 norm (< 1e-9),
    matching the C++ ``if (na < 1e-9f || nb < 1e-9f) return 1.0f;`` guard.

    Args:
        a: 1-D float32 array.
        b: 1-D float32 array of the same length as ``a``.

    Returns:
        Float in [0, 2]; 0 means identical direction, 2 means opposite.
    """
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    dot = _seq_sum(a * b)
    na = _seq_sum(a * a)
    nb = _seq_sum(b * b)
    if na < _EPS32 or nb < _EPS32:
        return 1.0
    return float(np.float32(1.0) - dot / (np.sqrt(na) * np.sqrt(nb)))


def manhattan(a: np.ndarray, b: np.ndarray) -> float:
    """
    Manhattan (L1) distance.

    Port of C++ ``manhattan`` (main.cpp:54–58)::

        sum(|a_i - b_i|)

    Args:
        a: 1-D float32 array.
        b: 1-D float32 array of the same length as ``a``.

    Returns:
        Non-negative float distance.
    """
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    return float(_seq_sum(np.abs(a - b)))


def get_dist_fn(metric: str) -> DistFn:
    """
    Return the distance function matching ``metric``.

    Port of C++ ``getDistFn`` (main.cpp:60–64).
    Falls back to ``euclidean`` for unknown strings (same as C++).

    Args:
        metric: One of ``"cosine"``, ``"manhattan"``, or ``"euclidean"``.

    Returns:
        Callable ``(a, b) -> float``.
    """
    if metric == "cosine":
        return cosine
    if metric == "manhattan":
        return manhattan
    return euclidean


# ---------------------------------------------------------------------------
# Batched distances (one query vs. many rows)
#
# Each ``*_batch(q, M)`` returns a float32 array whose element ``i`` is
# *bit-identical* to ``<metric>(q, M[i])``: element-wise float32 ops are the
# same, and the per-row sum uses ``cumsum(axis=1)``, which accumulates
# strictly left-to-right in float32 exactly like the scalar ``_seq_sum``.
# (Do NOT replace with ``np.sum``/``np.dot``/``@``: pairwise/SIMD summation
# changes the last ulps and breaks C++ parity.)
# ---------------------------------------------------------------------------

BatchFn = Callable[[np.ndarray, np.ndarray], np.ndarray]


def _row_seq_sum(x: np.ndarray) -> np.ndarray:
    if x.shape[1] == 0:
        return np.zeros(x.shape[0], dtype=np.float32)
    return x.cumsum(axis=1, dtype=np.float32)[:, -1]


def euclidean_batch(q: np.ndarray, m: np.ndarray) -> np.ndarray:
    """Batched :func:`euclidean`; ``m`` has shape ``(n, dims)`` float32."""
    diff = q - m
    return np.sqrt(_row_seq_sum(diff * diff))


def manhattan_batch(q: np.ndarray, m: np.ndarray) -> np.ndarray:
    """Batched :func:`manhattan`."""
    return _row_seq_sum(np.abs(q - m))


def cosine_batch(q: np.ndarray, m: np.ndarray) -> np.ndarray:
    """Batched :func:`cosine` (including the near-zero-norm ``1.0`` guard)."""
    dot = _row_seq_sum(q * m)
    na = _seq_sum(q * q)
    nb = _row_seq_sum(m * m)
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.float32(1.0) - dot / (np.sqrt(na) * np.sqrt(nb))
    return np.where((na < _EPS32) | (nb < _EPS32), np.float32(1.0), out).astype(
        np.float32, copy=False
    )


_BATCH_FNS: dict = {
    euclidean: euclidean_batch,
    cosine: cosine_batch,
    manhattan: manhattan_batch,
}


def get_batch_fn(dist: DistFn) -> BatchFn | None:
    """Batch equivalent of a built-in metric, or ``None`` for custom functions."""
    return _BATCH_FNS.get(dist)
