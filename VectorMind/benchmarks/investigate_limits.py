"""
Investigation of two inherited limitations (Task 03 follow-up). DIAGNOSTIC ONLY:
nothing here changes engine behaviour; experimental variants live in this file.

    python -m benchmarks.investigate_limits

Part A  HNSW recall on tightly clustered data (n=5000, d=16, 10 clusters, euclidean)
  A1  layer-0 graph structure: undirected components, cluster purity,
      cross-cluster edge fraction
  A2  per query: start node of the layer-0 search (after the real upper-layer
      descent) and the set of nodes reachable from it over directed layer-0
      edges. ``reach_upper_bound`` = fraction of the true top-k inside that
      set, an upper bound on what layer-0 beam search can return.
  A3  variants (prototyped here, NOT in the engine):
        * baseline with M=32
        * hnswlib-style diversity heuristic (HNSW paper Alg.4, no
          keepPrunedConnections) for BOTH new-node selection and neighbour
          list shrinking
Part B  KD-Tree under cosine
  B1  recall of the engine's KD-Tree (cosine) vs exact brute force
  B2  KD-Tree (euclidean) on L2-normalised vectors vs exact cosine brute force

Writes benchmarks/results/limits_investigation.json.
"""
from __future__ import annotations

import json
import time
from collections import Counter, deque
from pathlib import Path

import numpy as np

from engine.brute_force import BruteForce
from engine.hnsw import HNSW, _Node
from engine.kdtree import KDTree
from engine.metrics import cosine, euclidean, get_batch_fn
from engine.models import VectorItem

RESULTS = Path(__file__).resolve().parent / "results"
N, NQ, D, K, EF = 5000, 100, 16, 10, 50


# ── data with cluster labels (same generator as benchmarks.cppref.clustered) ─
def clustered_labeled(n, d, seed, clusters=10, sigma=0.05):
    rng = np.random.default_rng(seed)
    centres = rng.random((clusters, d), dtype=np.float32)
    assign = rng.integers(0, clusters, size=n)
    pts = (centres[assign] + rng.normal(0, sigma, (n, d)).astype(np.float32)).astype(np.float32)
    return pts, assign


def items_of(data):
    return [VectorItem(id=i + 1, metadata="m", category="c", emb=r) for i, r in enumerate(data)]


# ── experimental variant (NOT part of the engine) ───────────────────────────
class HeuristicHNSW(HNSW):
    """
    Same insertion flow as engine.HNSW.insert, but neighbour selection AND
    over-full neighbour-list shrinking use the HNSW paper's Alg.4 heuristic
    as in hnswlib (keep candidate e only if no already-selected r is closer
    to e than e is to the base point), without keepPrunedConnections.
    """

    def _heuristic(self, cands, max_m):
        bfn = get_batch_fn(self._d)
        sel, embs = [], []
        for d_e, e in cands:                         # cands ascending (d, id)
            if len(sel) >= max_m:
                break
            ee = self._G[e].item.emb
            if embs:
                ds = (bfn(ee, np.stack(embs)) if bfn is not None
                      else np.array([self._d(ee, s) for s in embs]))
                if (ds < d_e).any():
                    continue
            sel.append(e)
            embs.append(ee)
        return sel

    def insert(self, item, dist):
        self._d = dist
        id_ = item.id
        lvl = self._rand_level()
        self._G[id_] = _Node(item=item, max_lyr=lvl, nbrs=[[] for _ in range(lvl + 1)])
        if self._entry_pt is None:
            self._entry_pt, self._top_layer = id_, lvl
            return
        ep = self._entry_pt
        for lc in range(self._top_layer, lvl, -1):
            if lc < len(self._G[ep].nbrs):
                W = self._search_layer(item.emb, ep, 1, lc, dist)
                if W:
                    ep = W[0][1]
        for lc in range(min(self._top_layer, lvl), -1, -1):
            W = self._search_layer(item.emb, ep, self._ef_build, lc, dist)
            max_m = self._M0 if lc == 0 else self._M
            sel = self._heuristic(W, max_m)
            self._G[id_].nbrs[lc] = sel
            for nid in sel:
                nb = self._G[nid]
                while len(nb.nbrs) <= lc:
                    nb.nbrs.append([])
                conn = nb.nbrs[lc]
                conn.append(id_)
                if len(conn) > max_m:
                    cs = [c for c in conn if c in self._G]
                    ds = sorted(zip(self._dists(nb.item.emb, cs, dist), cs))
                    nb.nbrs[lc] = self._heuristic(ds, max_m)
            if W:
                ep = W[0][1]
        if lvl > self._top_layer:
            self._top_layer, self._entry_pt = lvl, id_


def build(cls, items, dist, m=16, ef_build=200):
    h = cls(m, ef_build)
    t = time.perf_counter()
    for it in items:
        h.insert(it, dist)
    return h, time.perf_counter() - t


# ── analysis helpers ────────────────────────────────────────────────────────
def layer0_start(h, q, dist):
    """Replicates the upper-layer descent of HNSW.knn; returns layer-0 start."""
    ep = h._entry_pt
    for lc in range(h._top_layer, 0, -1):
        if lc < len(h._G[ep].nbrs):
            W = h._search_layer(q, ep, 1, lc, dist)
            if W:
                ep = W[0][1]
    return ep


def reach0(h, start):
    seen, dq = {start}, deque([start])
    while dq:
        u = dq.popleft()
        for v in h._G[u].nbrs[0]:
            if v not in seen:
                seen.add(v)
                dq.append(v)
    return seen


def structure(h, labels):
    G = h._G
    und = {i: set() for i in G}
    cross = tot = 0
    for i, nd in G.items():
        for j in nd.nbrs[0]:
            und[i].add(j)
            und[j].add(i)
            tot += 1
            cross += int(labels[i - 1] != labels[j - 1])
    seen, comps = set(), []
    for s in G:
        if s in seen:
            continue
        comp, dq = [], deque([s])
        seen.add(s)
        while dq:
            u = dq.popleft()
            comp.append(u)
            for v in und[u]:
                if v not in seen:
                    seen.add(v)
                    dq.append(v)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    return {
        "undirected_components": len(comps),
        "top_component_sizes": [len(c) for c in comps[:12]],
        "component_cluster_purity": [
            round(Counter(int(labels[i - 1]) for i in c).most_common(1)[0][1] / len(c), 3)
            for c in comps[:12]],
        "cross_cluster_edge_fraction": round(cross / tot, 4),
    }


def evaluate(h, bf, qs, qlabels, dist):
    rec, ub = [], []
    for q in qs:
        truth = {i for _, i in bf.knn(q, K, dist)}
        got = {i for _, i in h.knn(q, K, EF, dist)}
        rec.append(len(truth & got) / K)
        ub.append(len(truth & reach0(h, layer0_start(h, q, dist))) / K)
    rec, ub = np.array(rec), np.array(ub)
    by_cluster = {int(c): round(float(rec[qlabels == c].mean()), 3)
                  for c in sorted(set(qlabels.tolist()))}
    return {
        "recall": round(float(rec.mean()), 4),
        "reach_upper_bound": round(float(ub.mean()), 4),
        "queries_with_recall_eq_upper_bound": int((np.abs(rec - ub) < 1e-9).sum()),
        "queries_with_upper_bound_0": int((ub == 0).sum()),
        "recall_by_query_cluster": by_cluster,
    }


def main() -> None:
    out: dict = {"params": {"n": N, "queries": NQ, "dims": D, "k": K, "ef": EF,
                            "ef_build": 200, "clusters": 10, "sigma": 0.05, "seed": 11}}
    dist = euclidean
    full, lab_all = clustered_labeled(N + NQ, D, seed=11)
    data, qs, labels, qlabels = full[:N], full[N:], lab_all[:N], lab_all[N:]
    items = items_of(data)
    bf = BruteForce()
    for it in items:
        bf.insert(it)

    out["A"] = {}
    for name, cls, m in [("baseline_M16", HNSW, 16), ("baseline_M32", HNSW, 32),
                         ("heuristic_M16", HeuristicHNSW, 16)]:
        h, secs = build(cls, items, dist, m=m)
        row = {"build_s": round(secs, 2), **structure(h, labels),
               **evaluate(h, bf, qs, qlabels, dist)}
        out["A"][name] = row
        print(f"A {name}: " + json.dumps(row))

    out["B_kdtree_cosine"] = {}
    nrm = lambda a: (a / np.maximum(np.linalg.norm(a, axis=-1, keepdims=True), 1e-30)).astype(np.float32)
    for dname, d_, gen in [
        ("uniform16", 16, lambda n, d, s: np.random.default_rng(s).random((n, d), dtype=np.float32)),
        ("clustered16", 16, lambda n, d, s: clustered_labeled(n, d, s)[0]),
        ("clustered128", 128, lambda n, d, s: clustered_labeled(n, d, s)[0]),
    ]:
        full_b = gen(2000 + 100, d_, 21)
        db, qb = full_b[:2000], full_b[2000:]
        its = items_of(db)
        bfc, kd, kdn = BruteForce(), KDTree(d_), KDTree(d_)
        for it, row in zip(its, nrm(db)):
            bfc.insert(it)
            kd.insert(it)
            kdn.insert(VectorItem(id=it.id, metadata="m", category="c", emb=row))
        r_kd = r_norm = 0.0
        for q, qq in zip(qb, nrm(qb)):
            truth = {i for _, i in bfc.knn(q, K, cosine)}
            r_kd += len(truth & {i for _, i in kd.knn(q, K, cosine)}) / K
            r_norm += len(truth & {i for _, i in kdn.knn(qq, K, euclidean)}) / K
        out["B_kdtree_cosine"][dname] = {
            "n": 2000, "queries": 100,
            "engine_kdtree_cosine_recall": round(r_kd / len(qb), 4),
            "kdtree_euclid_on_normalised_recall": round(r_norm / len(qb), 4)}
        print("B", dname, out["B_kdtree_cosine"][dname])

    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "limits_investigation.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
