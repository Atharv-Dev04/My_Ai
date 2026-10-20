"""
DocumentDB — HNSW index over Ollama-generated embeddings.

Faithful Python port of C++ class ``DocumentDB`` (main.cpp:651–711).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import threading

import numpy as np

from .brute_force import BruteForce
from .hnsw import HNSW
from .metrics import cosine
from .models import DocItem, VectorItem


class DocumentDB:
    """
    Document / chunk store backed by HNSW (primary) or BruteForce (small sets).

    Port of C++ ``class DocumentDB`` (main.cpp:651–711).

    Semantics that match the C++ original exactly:
      * Uses **cosine distance** for all searches (hard-coded, same as C++
        ``hnsw.insert(vi, cosine)`` and ``bf.knn(q, k, cosine)``).
      * Switches from BruteForce to HNSW when ``size >= 10``
        (C++: ``store.size() < 10``, main.cpp:682).
      * ``dims`` is set from the first inserted embedding and never changed.
      * ``max_dist`` filter default is ``0.7`` (same as C++ main.cpp:678).

    Thread safety: single ``threading.Lock`` (mirrors C++ ``std::mutex``).

    Public API:
        ``insert(title, text, emb)``     → int
        ``search(q, k, max_dist=0.7)``   → list[tuple[float, DocItem]]
        ``remove(id_)``                  → bool
        ``all()``                        → list[DocItem]
        ``size``                         → int  (property)
        ``dims``                         → int  (property)
    """

    _HNSW_THRESHOLD: int = 10   # switch to HNSW when store reaches this size

    def __init__(self) -> None:
        self._store: dict[int, DocItem] = {}
        self._hnsw = HNSW(m=16, ef_build=200)
        self._bf = BruteForce()
        self._lock = threading.Lock()
        self._next_id: int = 1
        self._dims: int = 0

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(self, title: str, text: str, emb: np.ndarray) -> int:
        """
        Embed a chunk and add it to both indexes.

        Port of C++ ``DocumentDB::insert`` (main.cpp:663–674).
        The first call also sets ``dims`` from ``len(emb)``.
        """
        with self._lock:
            emb = np.asarray(emb, dtype=np.float32)
            if self._dims == 0:
                self._dims = int(emb.shape[0])
            item = DocItem(id=self._next_id, title=title, text=text, emb=emb)
            self._next_id += 1
            self._store[item.id] = item
            vi = VectorItem(
                id=item.id, metadata=title, category="doc", emb=emb
            )
            self._hnsw.insert(vi, cosine)
            self._bf.insert(vi)
            return item.id

    def search(
        self, q: np.ndarray, k: int, max_dist: float = 0.7
    ) -> list[tuple[float, DocItem]]:
        """
        Return up to ``k`` most similar chunks with distance ≤ ``max_dist``.

        Port of C++ ``DocumentDB::search`` (main.cpp:677–689).

        Uses BruteForce when ``len(store) < 10``, HNSW otherwise.
        Hard-coded cosine distance (same as C++).
        """
        with self._lock:
            if not self._store:
                return []
            q = np.asarray(q, dtype=np.float32)
            if len(self._store) < self._HNSW_THRESHOLD:
                raw = self._bf.knn(q, k, cosine)
            else:
                raw = self._hnsw.knn(q, k, 50, cosine)
            return [
                (d, self._store[id_])
                for d, id_ in raw
                if id_ in self._store and d <= max_dist
            ]

    def remove(self, id_: int) -> bool:
        """
        Remove a chunk by id.

        Port of C++ ``DocumentDB::remove`` (main.cpp:691–696).
        """
        with self._lock:
            if id_ not in self._store:
                return False
            del self._store[id_]
            self._hnsw.remove(id_)
            self._bf.remove(id_)
            return True

    def all(self) -> list[DocItem]:
        """
        Return all stored chunks.

        Port of C++ ``DocumentDB::all`` (main.cpp:698–703).
        """
        with self._lock:
            return list(self._store.values())

    @property
    def size(self) -> int:
        """Number of chunks. Port of C++ ``DocumentDB::size`` (main.cpp:705–708)."""
        with self._lock:
            return len(self._store)

    @property
    def dims(self) -> int:
        """Embedding dimension. Port of C++ ``DocumentDB::getDims`` (main.cpp:710)."""
        return self._dims
