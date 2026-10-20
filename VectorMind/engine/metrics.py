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
    return float(np.sqrt(np.dot(diff, diff)))


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
    na = float(np.dot(a, a))
    nb = float(np.dot(b, b))
    if na < 1e-9 or nb < 1e-9:
        return 1.0
    return float(1.0 - np.dot(a, b) / (np.sqrt(na) * np.sqrt(nb)))


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
    return float(np.sum(np.abs(a - b)))


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
