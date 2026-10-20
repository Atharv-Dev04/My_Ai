"""
Unified VectorDB facade over BruteForce, KDTree, and HNSW.

Faithful Python port of C++ class ``VectorDB`` (main.cpp:337–429).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass

import numpy as np

from .brute_force import BruteForce
from .hnsw import HNSW, GraphInfo
from .kdtree import KDTree
from .metrics import DistFn, get_dist_fn
from .models import VectorItem


# ---------------------------------------------------------------------------
# Result data-classes  (ports of C++ inner structs main.cpp:369–394)
# ---------------------------------------------------------------------------

@dataclass
class SearchHit:
    """Port of C++ ``VectorDB::Hit`` (main.cpp:369)."""

    id: int
    meta: str
    cat: str
    emb: np.ndarray
    dist: float


@dataclass
class SearchOut:
    """Port of C++ ``VectorDB::SearchOut`` (main.cpp:370)."""

    hits: list[SearchHit]
    latency_us: float
    algo: str
    metric: str


@dataclass
class BenchOut:
    """Port of C++ ``VectorDB::BenchOut`` (main.cpp:394)."""

    bf_us: float
    kd_us: float
    hnsw_us: float
    n: int


# ---------------------------------------------------------------------------
# VectorDB
# ---------------------------------------------------------------------------

class VectorDB:
    """
    Thread-safe facade over BruteForce, KDTree, and HNSW (16-D demo index).

    Port of C++ ``class VectorDB`` (main.cpp:337–429).

    All three indexes are kept in sync on every mutation:
      * Insert   — appended to all three.
      * Remove   — BruteForce and HNSW use their own remove; KDTree is
                   **rebuilt** from the remaining store (same as C++
                   main.cpp:364–365).

    IDs are auto-incrementing from 1 (``nextId = 1`` in C++).

    Thread safety: a single ``threading.Lock`` guards all public methods
    (mirrors C++ ``std::mutex mu``).

    Public API:
        ``insert(meta, cat, emb, dist)`` → int
        ``remove(id_)``                  → bool
        ``search(q, k, metric, algo)``   → SearchOut
        ``benchmark(q, k, metric)``      → BenchOut
        ``all()``                        → list[VectorItem]
        ``hnsw_info()``                  → GraphInfo
        ``size``                         → int  (property)
        ``dims``                         → int
    """

    def __init__(self, dims: int) -> None:
        self.dims: int = dims
        self._store: dict[int, VectorItem] = {}
        self._bf = BruteForce()
        self._kdt = KDTree(dims)
        self._hnsw = HNSW(m=16, ef_build=200)
        self._lock = threading.Lock()
        self._next_id: int = 1

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(
        self, meta: str, cat: str, emb: np.ndarray, dist: DistFn
    ) -> int:
        """
        Insert a new vector and return its auto-assigned id.

        Port of C++ ``VectorDB::insert`` (main.cpp:349–357).
        """
        with self._lock:
            emb = np.asarray(emb, dtype=np.float32)
            item = VectorItem(
                id=self._next_id, metadata=meta, category=cat, emb=emb
            )
            self._next_id += 1
            self._store[item.id] = item
            self._bf.insert(item)
            self._kdt.insert(item)
            self._hnsw.insert(item, dist)
            return item.id

    def remove(self, id_: int) -> bool:
        """
        Delete a vector by id.  Returns False if not found.

        Port of C++ ``VectorDB::remove`` (main.cpp:359–367).
        KD-Tree is rebuilt from the remaining store after every deletion
        (same as C++: main.cpp:364–365).
        """
        with self._lock:
            if id_ not in self._store:
                return False
            del self._store[id_]
            self._bf.remove(id_)
            self._hnsw.remove(id_)
            self._kdt.rebuild(list(self._store.values()))
            return True

    def search(
        self, q: np.ndarray, k: int, metric: str, algo: str
    ) -> SearchOut:
        """
        KNN search using the requested algorithm and metric.

        Port of C++ ``VectorDB::search`` (main.cpp:372–392).

        Args:
            q:      Query vector.
            k:      Number of neighbours.
            metric: ``"cosine"`` | ``"euclidean"`` | ``"manhattan"``.
            algo:   ``"hnsw"`` | ``"kdtree"`` | ``"bruteforce"``.
                    Defaults to HNSW for unknown strings (same as C++).

        Returns:
            :class:`SearchOut` with hits and latency in µs.
        """
        with self._lock:
            dfn = get_dist_fn(metric)
            q = np.asarray(q, dtype=np.float32)

            t0 = time.perf_counter()
            if algo == "bruteforce":
                raw = self._bf.knn(q, k, dfn)
            elif algo == "kdtree":
                raw = self._kdt.knn(q, k, dfn)
            else:                                   # default: hnsw
                raw = self._hnsw.knn(q, k, 50, dfn)
            latency_us = (time.perf_counter() - t0) * 1_000_000

            hits = [
                SearchHit(
                    id=id_,
                    meta=self._store[id_].metadata,
                    cat=self._store[id_].category,
                    emb=self._store[id_].emb,
                    dist=d,
                )
                for d, id_ in raw
                if id_ in self._store
            ]
            return SearchOut(
                hits=hits, latency_us=latency_us, algo=algo, metric=metric
            )

    def benchmark(self, q: np.ndarray, k: int, metric: str) -> BenchOut:
        """
        Time all three algorithms on the same query.

        Port of C++ ``VectorDB::benchmark`` (main.cpp:396–411).
        HNSW uses ef=50 (same as C++ main.cpp:408).
        """
        with self._lock:
            dfn = get_dist_fn(metric)
            q = np.asarray(q, dtype=np.float32)

            def _timed(fn) -> float:
                t0 = time.perf_counter()
                fn()
                return (time.perf_counter() - t0) * 1_000_000

            return BenchOut(
                bf_us=_timed(lambda: self._bf.knn(q, k, dfn)),
                kd_us=_timed(lambda: self._kdt.knn(q, k, dfn)),
                hnsw_us=_timed(lambda: self._hnsw.knn(q, k, 50, dfn)),
                n=len(self._store),
            )

    def all(self) -> list[VectorItem]:
        """
        Return all stored items.

        Port of C++ ``VectorDB::all`` (main.cpp:413–418).
        """
        with self._lock:
            return list(self._store.values())

    def hnsw_info(self) -> GraphInfo:
        """
        Return HNSW graph structure info.

        Port of C++ ``VectorDB::hnswInfo`` (main.cpp:420–423).
        """
        with self._lock:
            return self._hnsw.get_info()

    @property
    def size(self) -> int:
        """Number of stored vectors. Port of C++ ``VectorDB::size`` (main.cpp:425–428)."""
        with self._lock:
            return len(self._store)
