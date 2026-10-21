"""
HNSW — Hierarchical Navigable Small World graph index.

Faithful Python port of C++ class ``HNSW`` (main.cpp:165–331).

Default parameters matching the C++ original (main.cpp:227–229):
    M          = 16
    M0         = 2 * M = 32   (layer-0 max connections)
    ef_build   = 200
    mL         = 1.0 / log(M) ≈ 0.3607
    rng seed   = 42

Deviation D1 (RNG) — RESOLVED in Task 03: level assignment now uses a
bit-exact emulation of ``std::mt19937(42)`` + libstdc++
``uniform_real_distribution<float>`` (see ``_mt19937.py``), so levels match
a g++ build of the original for the same insertion order. Verified against
the C++ harness in ``benchmarks/`` / ``tests/test_cpp_parity.py``.

Deviation D4 (topLayer on remove): ``_top_layer`` is not updated when the
highest-layer node is deleted. This matches the C++ original; graceful
degradation via per-node layer bounds checks prevents incorrect results.

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from ._mt19937 import Mt19937
from .metrics import DistFn, get_batch_fn
from .models import VectorItem


# ---------------------------------------------------------------------------
# Internal node representation
# ---------------------------------------------------------------------------

@dataclass
class _Node:
    """
    Port of C++ ``HNSW::Node`` (main.cpp:166–170).

    ``nbrs[layer]`` stores a list of neighbour IDs at that layer.
    The list is grown lazily so ``len(nbrs) == max_lyr + 1`` always holds
    after insertion.
    """

    item: VectorItem
    max_lyr: int
    nbrs: list[list[int]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Graph info (returned by get_info)
# ---------------------------------------------------------------------------

@dataclass
class GraphInfo:
    """
    Port of C++ ``HNSW::GraphInfo`` (main.cpp:299–305).

    Returned by :meth:`HNSW.get_info`.
    """

    top_layer: int
    node_count: int
    nodes_per_layer: list[int]
    edges_per_layer: list[int]

    @dataclass
    class NodeView:
        id: int
        metadata: str
        category: str
        max_lyr: int

    @dataclass
    class EdgeView:
        src: int
        dst: int
        lyr: int

    nodes: list[NodeView] = field(default_factory=list)
    edges: list[EdgeView] = field(default_factory=list)


# ---------------------------------------------------------------------------
# HNSW
# ---------------------------------------------------------------------------

class HNSW:
    """
    Hierarchical Navigable Small World approximate nearest-neighbour graph.

    Port of C++ ``class HNSW`` (main.cpp:165–331).

    Algorithmic summary:

    * Nodes are assigned a random maximum layer via
      ``floor(-ln(uniform)*mL)``.
    * Insertion performs a greedy descent from ``topLayer`` down to 0,
      connecting to the ``M`` (or ``M0`` at layer 0) nearest neighbours
      at each layer and pruning over-connected neighbours.
    * Search descends from ``topLayer`` to layer 1 with ``ef=1``, then
      runs a beam search at layer 0 with ``ef = max(ef, k)``.
    * Deletion removes the node and its references from all neighbour lists
      in O(nodes·edges). ``topLayer`` is intentionally **not** updated
      (matching the C++ original; Deviation D4).

    Public API:
        ``insert(item, dist)``         — Insert VectorItem into the graph.
        ``knn(q, k, ef, dist)``        — Approximate k-NN search.
        ``remove(id_)``                — Remove a node.
        ``get_info()``                 — Return :class:`GraphInfo`.
        ``size``                       — Property: number of nodes.
    """

    def __init__(
        self,
        m: int = 16,
        ef_build: int = 200,
        seed: int = 42,
    ) -> None:
        """
        Port of C++ HNSW constructor (main.cpp:227–229).

        Args:
            m:        Max connections per layer except layer 0 (M = 16).
            ef_build: Beam width during insertion (ef_construction = 200).
            seed:     RNG seed (42 matches C++ ``rng(42)``; see Deviation D1).
        """
        self._M: int = m
        self._M0: int = 2 * m           # layer-0 max connections
        self._ef_build: int = ef_build
        self._mL: float = float(np.float32(1.0) / np.log(np.float32(m)))  # float32, as C++
        self._rng: Mt19937 = Mt19937(seed)
        self._G: dict[int, _Node] = {}
        self._top_layer: int = -1
        self._entry_pt: Optional[int] = None

    # ── PRIVATE ──────────────────────────────────────────────────────────

    def _rand_level(self) -> int:
        """
        Sample a random maximum layer for a new node.

        Port of C++ ``HNSW::randLevel`` (main.cpp:179–182)::

            floor(-log(uniform(0,1)) * mL)
        """
        u = self._rng.uniform_float()
        # C++ evaluates -log(u) * mL entirely in float32 (u == 0 -> inf, UB
        # on the int cast in C++; guarded here)
        if u == 0.0:
            u = np.float32(1e-15)
        lvl = np.floor(-np.log(u) * np.float32(self._mL))
        return int(lvl)

    def _dists(
        self, q: np.ndarray, ids: list[int], dist: DistFn
    ) -> list[float]:
        """
        Distances from ``q`` to the stored embeddings of ``ids`` (all must
        exist in the graph), in the same order.

        Built-in metrics use the batched implementation, whose results are
        bit-identical to per-pair calls (see ``metrics.py``). Custom
        distance functions fall back to per-pair calls.
        """
        G = self._G
        batch = get_batch_fn(dist) if len(ids) > 1 else None
        if batch is None:
            return [dist(q, G[i].item.emb) for i in ids]
        m = np.stack([G[i].item.emb for i in ids])
        if m.dtype != np.float32:
            m = m.astype(np.float32)
        return batch(np.asarray(q, dtype=np.float32), m).tolist()

    def _search_layer(
        self,
        q: np.ndarray,
        ep: int,
        ef: int,
        lyr: int,
        dist: DistFn,
    ) -> list[tuple[float, int]]:
        """
        Beam search within a single HNSW layer.

        Port of C++ ``HNSW::searchLayer`` (main.cpp:184–217).

        Uses two heaps mirroring the C++ priority_queues:
          * ``cands`` — min-heap of ``(distance, id)``  [C++ min-heap]
          * ``found`` — max-heap simulated via negated values in
            ``(-distance, id)``  [C++ max-heap of size ef]

        Returns list of ``(distance, id)`` sorted ascending, length ≤ ef.
        """
        visited: set[int] = {ep}

        d0 = dist(q, self._G[ep].item.emb)
        # cands: min-heap — smallest distance first
        cands: list[tuple[float, int]] = [(d0, ep)]
        # found: max-heap on (dist, id) emulated as min-heap of (-dist, -id),
        # matching C++ priority_queue<pair<float,int>> tie order (largest id
        # is popped first among equal distances)
        found: list[tuple[float, int]] = [(-d0, -ep)]

        while cands:
            cd, cid = heapq.heappop(cands)

            # C++ (main.cpp:199): if found is full and current candidate
            # is farther than the worst found, stop.
            if len(found) >= ef and cd > -found[0][0]:
                break

            node = self._G.get(cid)
            # C++ (main.cpp:200): skip if node has no edges at this layer
            if node is None or lyr >= len(node.nbrs):
                continue

            # C++ (main.cpp:202): skip visited or missing nodes. Fresh
            # neighbours are collected first, then their distances computed
            # in one batch; the per-neighbour processing order is unchanged.
            fresh: list[int] = []
            for nid in node.nbrs[lyr]:
                if nid in visited or nid not in self._G:
                    continue
                visited.add(nid)
                fresh.append(nid)
            if not fresh:
                continue
            for nid, nd in zip(fresh, self._dists(q, fresh, dist)):
                # C++ (main.cpp:205): add if found is not full or improves worst
                if len(found) < ef or nd < -found[0][0]:
                    heapq.heappush(cands, (nd, nid))
                    heapq.heappush(found, (-nd, -nid))
                    if len(found) > ef:
                        heapq.heappop(found)  # remove worst (largest dist)

        # Reconstruct and sort ascending — mirrors C++ sort after pop-all
        result = [(-neg_d, -neg_id) for neg_d, neg_id in found]
        result.sort()
        return result

    def _select_nbrs(
        self, cands: list[tuple[float, int]], max_m: int
    ) -> list[int]:
        """
        Select at most ``max_m`` neighbours from sorted candidates.

        Port of C++ ``HNSW::selectNbrs`` (main.cpp:219–224).
        Takes the first ``max_m`` IDs from the already-ascending list.
        """
        return [id_ for _, id_ in cands[:max_m]]

    # ── PUBLIC ───────────────────────────────────────────────────────────

    def insert(self, item: VectorItem, dist: DistFn) -> None:
        """
        Insert a node into the graph.

        Port of C++ ``HNSW::insert`` (main.cpp:231–269).

        Algorithm:
          1. Assign a random level ``lvl``.
          2. Greedy descent from ``topLayer`` to ``lvl+1`` (ef=1).
          3. For each layer from ``min(topLayer, lvl)`` down to 0:
             a. Beam search (ef=ef_build) to find candidates.
             b. Connect to up to M (or M0 at layer 0) nearest neighbours.
             c. Prune over-connected neighbours by distance.
          4. Update entry point if ``lvl > topLayer``.
        """
        id_ = item.id
        lvl = self._rand_level()
        node = _Node(
            item=item,
            max_lyr=lvl,
            nbrs=[[] for _ in range(lvl + 1)],
        )
        self._G[id_] = node

        # First insertion becomes the entry point
        if self._entry_pt is None:
            self._entry_pt = id_
            self._top_layer = lvl
            return

        ep = self._entry_pt

        # ── Phase 1: Greedy descent from topLayer to lvl+1 ──────────────
        # C++ (main.cpp:239–244): greedy search with ef=1 to find closest
        # entry point for the new node's layers.
        for lc in range(self._top_layer, lvl, -1):
            if ep not in self._G:
                break
            if lc < len(self._G[ep].nbrs):
                W = self._search_layer(item.emb, ep, 1, lc, dist)
                if W:
                    ep = W[0][1]

        # ── Phase 2: Connect at layers min(topLayer, lvl) … 0 ──────────
        # C++ (main.cpp:245–268)
        for lc in range(min(self._top_layer, lvl), -1, -1):
            if ep not in self._G:
                break

            W = self._search_layer(item.emb, ep, self._ef_build, lc, dist)
            max_m = self._M0 if lc == 0 else self._M
            sel = self._select_nbrs(W, max_m)

            self._G[id_].nbrs[lc] = sel

            # Add bidirectional edges; prune if neighbour is over-connected
            for nid in sel:
                if nid not in self._G:
                    continue
                nbr_node = self._G[nid]
                # Ensure neighbour has sufficient layer slots
                while len(nbr_node.nbrs) <= lc:
                    nbr_node.nbrs.append([])
                conn = nbr_node.nbrs[lc]
                conn.append(id_)

                # C++ (main.cpp:256–264): prune over-connected neighbour
                if len(conn) > max_m:
                    cs = [c for c in conn if c in self._G]
                    ds: list[tuple[float, int]] = list(
                        zip(self._dists(nbr_node.item.emb, cs, dist), cs)
                    )
                    ds.sort()                           # ascending by (dist, id)
                    nbr_node.nbrs[lc] = [c for _, c in ds[:max_m]]

            # Advance entry point to best candidate (C++ main.cpp:266)
            if W:
                ep = W[0][1]

        # Update global entry point if new node is at a higher layer
        if lvl > self._top_layer:
            self._top_layer = lvl
            self._entry_pt = id_

    def knn(
        self, q: np.ndarray, k: int, ef: int, dist: DistFn
    ) -> list[tuple[float, int]]:
        """
        Approximate k-nearest-neighbour search.

        Port of C++ ``HNSW::knn`` (main.cpp:271–285).

        Args:
            q:    Query vector (auto-cast to float32).
            k:    Number of neighbours to return.
            ef:   Search beam width at layer 0 (≥ k recommended).
            dist: Distance function.

        Returns:
            List of ``(distance, id)`` pairs, length ``≤ k``, sorted ascending.
            Returns ``[]`` if the graph is empty.
        """
        if self._entry_pt is None:
            return []

        q = np.asarray(q, dtype=np.float32)
        ep = self._entry_pt

        # Greedy descent from topLayer to layer 1
        for lc in range(self._top_layer, 0, -1):
            if ep not in self._G:
                break
            if lc < len(self._G[ep].nbrs):
                W = self._search_layer(q, ep, 1, lc, dist)
                if W:
                    ep = W[0][1]

        # Beam search at layer 0 with ef = max(ef, k)
        W = self._search_layer(q, ep, max(ef, k), 0, dist)
        return W[:k]

    def remove(self, id_: int) -> None:
        """
        Remove a node and all its references from the graph.

        Port of C++ ``HNSW::remove`` (main.cpp:287–297).

        Complexity: O(nodes · max_edges_per_layer).
        Note: ``_top_layer`` is **not** updated (Deviation D4; same as C++).
        """
        if id_ not in self._G:
            return

        # Remove id_ from every neighbour list in the entire graph
        for node in self._G.values():
            for layer in node.nbrs:
                try:
                    layer.remove(id_)
                except ValueError:
                    pass

        # Reassign entry point if the deleted node was it
        if self._entry_pt == id_:
            self._entry_pt = None
            # C++ picks the first non-deleted node encountered
            for nid in self._G:
                if nid != id_:
                    self._entry_pt = nid
                    break

        del self._G[id_]

    def get_info(self) -> GraphInfo:
        """
        Return structural statistics about the graph.

        Port of C++ ``HNSW::getInfo`` (main.cpp:308–328).
        """
        max_l = max(self._top_layer + 1, 1)
        nodes_per_layer = [0] * max_l
        edges_per_layer = [0] * max_l
        node_views: list[GraphInfo.NodeView] = []
        edge_views: list[GraphInfo.EdgeView] = []

        for id_, node in self._G.items():
            node_views.append(
                GraphInfo.NodeView(
                    id=id_,
                    metadata=node.item.metadata,
                    category=node.item.category,
                    max_lyr=node.max_lyr,
                )
            )
            for lc in range(min(node.max_lyr + 1, max_l)):
                nodes_per_layer[lc] += 1
                if lc < len(node.nbrs):
                    for nid in node.nbrs[lc]:
                        if id_ < nid:          # count each undirected edge once
                            edges_per_layer[lc] += 1
                            edge_views.append(
                                GraphInfo.EdgeView(src=id_, dst=nid, lyr=lc)
                            )

        return GraphInfo(
            top_layer=self._top_layer,
            node_count=len(self._G),
            nodes_per_layer=nodes_per_layer,
            edges_per_layer=edges_per_layer,
            nodes=node_views,
            edges=edge_views,
        )

    @property
    def size(self) -> int:
        """Number of nodes in the graph. Port of C++ ``HNSW::size`` (main.cpp:330)."""
        return len(self._G)
