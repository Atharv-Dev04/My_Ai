"""
Python-vs-C++ parity run (Task 03).

    python -m benchmarks.run_parity [--n 500] [--dims 16] [--queries 50]
                                    [--k 10] [--ef 50] [--seed 1]

Builds the original C++ classes (via benchmarks/cpp_reference/harness.exe)
and the Python engine on identical seeded datasets and compares HNSW levels,
neighbour lists, and BruteForce / KD-Tree / HNSW result lists.
Writes benchmarks/results/parity.json.
"""
from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from . import cppref as c

RESULTS = Path(__file__).resolve().parent / "results"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=500)
    ap.add_argument("--dims", type=int, default=16)
    ap.add_argument("--queries", type=int, default=50)
    ap.add_argument("--k", type=int, default=10)
    ap.add_argument("--ef", type=int, default=50)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()

    tmp = Path(tempfile.mkdtemp())
    out = {"params": vars(a), "runs": {}}
    try:
        for name, gen in c.DATASETS.items():
            data = gen(a.n, a.dims, seed=a.seed)
            qs = gen(a.queries, a.dims, seed=a.seed + 1)
            for metric in ("euclidean", "cosine", "manhattan"):
                cp = c.run_cpp(data, qs, metric, a.k, a.ef, tmp / f"{name}_{metric}")
                py = c.run_python(data, qs, metric, a.k, a.ef)
                r = c.compare(py, cp)
                out["runs"][f"{name}/{metric}"] = r
                print(f"{name:10s} {metric:10s} levels_mis={r['levels_mismatch']} "
                      f"nbr_mis={r['nbr_lists_mismatch']}/{r['nbr_lists_total']} "
                      f"id_mis bf/kd/hnsw={r['bf']['id_list_mismatch']}/"
                      f"{r['kd']['id_list_mismatch']}/{r['hnsw']['id_list_mismatch']} "
                      f"max_rel_dist={max(r[x]['max_rel_dist_diff'] for x in ('bf','kd','hnsw')):.1e}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "parity.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
