"""
Reproducible benchmark: Python engine vs original C++ (Task 03).

    python -m benchmarks.run_bench [--reps 3] [--queries 100] [--k 10] [--ef 50]

For each (dataset, n, dims, metric) config it reports, for Python and C++:
  * index build time per algorithm (single build pass; C++ harness is
    re-run ``--cpp-build-repeats`` times and the median is reported)
  * query latency median / p95 over (queries x reps) samples, in microseconds
  * recall@k of KD-Tree and HNSW vs exact brute-force ground truth
    (id-based; uniform/clustered float data has no exact ties)
Results are written to benchmarks/results/bench.json together with
hardware/software info. Nothing here is estimated: every number is measured.
"""
from __future__ import annotations

import argparse
import json
import platform
import shutil
import statistics
import tempfile
from pathlib import Path

import numpy as np

from . import cppref as c

RESULTS = Path(__file__).resolve().parent / "results"

# (dataset, n, dims) — sizes chosen so the pure-Python HNSW build is tractable
CONFIGS = [("uniform", 1000, 16), ("clustered", 5000, 16), ("clustered", 2000, 128)]
METRICS = ("euclidean", "cosine")


def pct(xs: list[int], p: float) -> float:
    s = sorted(xs)
    return s[min(len(s) - 1, int(round(p * (len(s) - 1))))] / 1000.0  # ns -> us


def summarize(q: dict[str, list[int]]) -> dict:
    return {a: {"median_us": statistics.median(v) / 1000.0, "p95_us": pct(v, 0.95),
                "samples": len(v)} for a, v in q.items()}


def recall(res: dict, truth: dict) -> float:
    hit = tot = 0
    for qi, t in truth.items():
        ids = {i for _, i in t}
        hit += len({i for _, i in res[qi]} & ids)
        tot += len(ids)
    return hit / tot


def hardware() -> dict:
    import numpy
    cpu = platform.processor()
    try:
        import subprocess
        cpu = subprocess.run(["powershell", "-NoProfile", "-Command",
                              "(Get-CimInstance Win32_Processor).Name"],
                             capture_output=True, text=True).stdout.strip() or cpu
    except Exception:
        pass
    return {"cpu": cpu, "os": platform.platform(), "python": platform.python_version(),
            "numpy": numpy.__version__}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--queries", type=int, default=100)
    ap.add_argument("--k", type=int, default=10)
    ap.add_argument("--ef", type=int, default=50)
    ap.add_argument("--cpp-build-repeats", type=int, default=3)
    a = ap.parse_args()

    tmp = Path(tempfile.mkdtemp())
    out = {"hardware": hardware(), "params": vars(a), "runs": []}
    try:
        for name, n, d in CONFIGS:
            # Queries are held out from the SAME generated distribution
            # (same cluster centres), not drawn from a different seed.
            full = c.DATASETS[name](n + a.queries, d, seed=11)
            data, qs = full[:n], full[n:]
            for metric in METRICS:
                cpp_runs = [c.run_cpp(data, qs, metric, a.k, a.ef,
                                      tmp / f"{name}{n}{d}{metric}{i}", reps=a.reps)
                            for i in range(a.cpp_build_repeats)]
                cpp = cpp_runs[0]
                py = c.run_python(data, qs, metric, a.k, a.ef, reps=a.reps)
                row = {
                    "dataset": name, "n": n, "dims": d, "metric": metric,
                    "cpp_build_s": {k: statistics.median(r.build_ns[k] for r in cpp_runs) / 1e9
                                    for k in ("bf", "kd", "hnsw")},
                    "py_build_s": {k: v / 1e9 for k, v in py.build_ns.items()},
                    "cpp_query": summarize(cpp.query_ns),
                    "py_query": summarize(py.query_ns),
                    "py_recall": {x: recall(py.results[x], py.results["bf"]) for x in ("kd", "hnsw")},
                    "cpp_recall": {x: recall(cpp.results[x], cpp.results["bf"]) for x in ("kd", "hnsw")},
                    "parity": c.compare(py, cpp),
                }
                out["runs"].append(row)
                print(f"\n== {name} n={n} d={d} {metric}")
                print(f"  build s  py  bf/kd/hnsw: " + "/".join(f"{row['py_build_s'][k]:.3f}" for k in ('bf', 'kd', 'hnsw')))
                print(f"  build s  cpp bf/kd/hnsw: " + "/".join(f"{row['cpp_build_s'][k]:.4f}" for k in ('bf', 'kd', 'hnsw')))
                for algo in ("bf", "kd", "hnsw"):
                    p, q_ = row["py_query"][algo], row["cpp_query"][algo]
                    print(f"  {algo:5s} query us  py med {p['median_us']:.1f} p95 {p['p95_us']:.1f} | "
                          f"cpp med {q_['median_us']:.1f} p95 {q_['p95_us']:.1f}")
                print(f"  recall@{a.k} py kd {row['py_recall']['kd']:.4f} hnsw {row['py_recall']['hnsw']:.4f}"
                      f" | cpp kd {row['cpp_recall']['kd']:.4f} hnsw {row['cpp_recall']['hnsw']:.4f}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "bench.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
