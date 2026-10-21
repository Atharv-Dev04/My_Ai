"""
Reproducible datasets and C++ reference runner for Task 03.

All datasets are generated from fixed seeds with ``numpy.random.default_rng``
and stored as float32. Matrices are exchanged with the C++ harness as text
using ``%.9g`` (lossless for float32).

Original project: https://github.com/perryvegehan/Your-OWN-AI  (MIT)
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
HARNESS = HERE / "cpp_reference" / "harness.exe"


# ── datasets ────────────────────────────────────────────────────────────────

def uniform(n: int, d: int, seed: int) -> np.ndarray:
    """i.i.d. U[0,1) float32 points."""
    return np.random.default_rng(seed).random((n, d), dtype=np.float32)


def clustered(n: int, d: int, seed: int, clusters: int = 10,
              sigma: float = 0.05) -> np.ndarray:
    """Gaussian clusters around uniform centres (float32)."""
    rng = np.random.default_rng(seed)
    centres = rng.random((clusters, d), dtype=np.float32)
    assign = rng.integers(0, clusters, size=n)
    pts = centres[assign] + rng.normal(0, sigma, (n, d)).astype(np.float32)
    return pts.astype(np.float32)


def grid_ties(n: int, d: int, seed: int, levels: int = 3) -> np.ndarray:
    """Coordinates drawn from a few integer levels -> many exactly tied
    distances and exact duplicates. Exactly representable in float32."""
    rng = np.random.default_rng(seed)
    return rng.integers(0, levels, size=(n, d)).astype(np.float32)


DATASETS = {"uniform": uniform, "clustered": clustered, "grid_ties": grid_ties}


# ── C++ harness I/O ─────────────────────────────────────────────────────────

def write_matrix(path: Path, arr: np.ndarray) -> None:
    arr = np.asarray(arr, dtype=np.float32)
    with open(path, "w", newline="\n") as f:
        f.write(f"{arr.shape[0]} {arr.shape[1]}\n")
        for row in arr:
            f.write(" ".join("%.9g" % x for x in row) + "\n")


@dataclass
class RunResult:
    """Normalised output of either the C++ harness or the Python engine."""

    build_ns: dict[str, int] = field(default_factory=dict)
    top: int = -1
    entry: int = -1
    levels: dict[int, int] = field(default_factory=dict)
    nbrs: dict[tuple[int, int], list[int]] = field(default_factory=dict)
    results: dict[str, dict[int, list[tuple[float, int]]]] = field(
        default_factory=lambda: {"bf": {}, "kd": {}, "hnsw": {}})
    query_ns: dict[str, list[int]] = field(
        default_factory=lambda: {"bf": [], "kd": [], "hnsw": []})


def run_cpp(data: np.ndarray, queries: np.ndarray, metric: str, k: int,
            ef: int, workdir: Path, reps: int = 1) -> RunResult:
    if not HARNESS.exists():
        raise FileNotFoundError(f"{HARNESS} not built; see harness.cpp header")
    workdir.mkdir(parents=True, exist_ok=True)
    dp, qp, op = workdir / "data.txt", workdir / "queries.txt", workdir / "out.txt"
    write_matrix(dp, data)
    write_matrix(qp, queries)
    subprocess.run([str(HARNESS), str(dp), str(qp), metric, str(k), str(ef),
                    str(op), str(reps)], check=True)
    rr = RunResult()
    for line in op.read_text().splitlines():
        t = line.split()
        if t[0] == "T":
            rr.build_ns[t[1].replace("build_", "").replace("_ns", "")] = int(t[2])
        elif t[0] == "H":
            rr.top, rr.entry = int(t[2]), int(t[4])
        elif t[0] == "L":
            rr.levels[int(t[1])] = int(t[2])
        elif t[0] == "N":
            rr.nbrs[(int(t[1]), int(t[2]))] = [int(x) for x in t[3:]]
        elif t[0] == "R":
            pairs = []
            for tok in t[3:]:
                d, i = tok.split(":")
                pairs.append((float(d), int(i)))
            rr.results[t[1]][int(t[2])] = pairs
        elif t[0] == "Q":
            rr.query_ns["bf"].append(int(t[2]))
            rr.query_ns["kd"].append(int(t[3]))
            rr.query_ns["hnsw"].append(int(t[4]))
    return rr


def run_python(data: np.ndarray, queries: np.ndarray, metric: str, k: int,
               ef: int, reps: int = 1) -> RunResult:
    """Run the Python engine with the same protocol as the harness."""
    import time

    from engine.brute_force import BruteForce
    from engine.hnsw import HNSW
    from engine.kdtree import KDTree
    from engine.metrics import get_dist_fn
    from engine.models import VectorItem

    dist = get_dist_fn(metric)
    items = [VectorItem(id=i + 1, metadata="m", category="c", emb=row)
             for i, row in enumerate(data)]
    bf, kd, hn = BruteForce(), KDTree(data.shape[1]), HNSW(16, 200)
    rr = RunResult()
    t0 = time.perf_counter_ns()
    for v in items:
        bf.insert(v)
    t1 = time.perf_counter_ns()
    for v in items:
        kd.insert(v)
    t2 = time.perf_counter_ns()
    for v in items:
        hn.insert(v, dist)
    t3 = time.perf_counter_ns()
    rr.build_ns = {"bf": t1 - t0, "kd": t2 - t1, "hnsw": t3 - t2}
    rr.top, rr.entry = hn._top_layer, hn._entry_pt if hn._entry_pt is not None else -1
    for i in range(1, len(items) + 1):
        node = hn._G[i]
        rr.levels[i] = node.max_lyr
        for lc, lst in enumerate(node.nbrs):
            rr.nbrs[(i, lc)] = list(lst)
    for qi, q in enumerate(queries):
        rr.results["bf"][qi] = bf.knn(q, k, dist)
        rr.results["kd"][qi] = kd.knn(q, k, dist)
        rr.results["hnsw"][qi] = hn.knn(q, k, ef, dist)
    for _ in range(reps):
        for q in queries:
            a = time.perf_counter_ns(); bf.knn(q, k, dist)
            b = time.perf_counter_ns(); kd.knn(q, k, dist)
            c = time.perf_counter_ns(); hn.knn(q, k, ef, dist)
            d = time.perf_counter_ns()
            rr.query_ns["bf"].append(b - a)
            rr.query_ns["kd"].append(c - b)
            rr.query_ns["hnsw"].append(d - c)
    return rr


# ── comparison ──────────────────────────────────────────────────────────────

def compare(py: RunResult, cpp: RunResult, rel_tol: float = 1e-5) -> dict:
    """Structured comparison of Python vs C++ outputs."""
    out: dict = {}
    out["levels_equal"] = py.levels == cpp.levels
    out["levels_mismatch"] = sum(1 for i in cpp.levels
                                 if py.levels.get(i) != cpp.levels[i])
    out["top_equal"] = py.top == cpp.top
    out["entry_equal"] = py.entry == cpp.entry
    keys = set(py.nbrs) | set(cpp.nbrs)
    out["nbr_lists_total"] = len(keys)
    out["nbr_lists_mismatch"] = sum(1 for k_ in keys
                                    if py.nbrs.get(k_) != cpp.nbrs.get(k_))
    for algo in ("bf", "kd", "hnsw"):
        n = len(cpp.results[algo])
        id_mis = dist_mis = 0
        max_rel = 0.0
        for qi, cres in cpp.results[algo].items():
            pres = py.results[algo][qi]
            if [i for _, i in pres] != [i for _, i in cres]:
                id_mis += 1
            if len(pres) == len(cres):
                for (pd, _), (cd, _) in zip(pres, cres):
                    rel = abs(pd - cd) / max(abs(cd), 1e-12)
                    max_rel = max(max_rel, rel)
                    if rel > rel_tol and abs(pd - cd) > 1e-6:
                        dist_mis += 1
            else:
                dist_mis += 1
        out[algo] = {"queries": n, "id_list_mismatch": id_mis,
                     "dist_mismatch": dist_mis, "max_rel_dist_diff": max_rel}
    return out
