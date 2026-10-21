"""Compare benchmark results before/after the Task 03 distance optimization."""
import json
from pathlib import Path

R = Path(__file__).resolve().parent / "results"
b = json.loads((R / "bench_before_opt.json").read_text())
a = json.loads((R / "bench.json").read_text())

print("Python engine, median query us and HNSW build s (before -> after); "
      "k=10 ef=50, 300 samples/cell")
for x, y in zip(b["runs"], a["runs"]):
    q = lambda k: f"{x['py_query'][k]['median_us']:.0f}->{y['py_query'][k]['median_us']:.0f}"
    p = y["parity"]
    ok = (all(p[k]["id_list_mismatch"] == 0 for k in ("bf", "kd", "hnsw"))
          and p["nbr_lists_mismatch"] == 0 and p["levels_equal"])
    print(f"{x['dataset']:9s} n={x['n']:<5d} d={x['dims']:<3d} {x['metric']:9s} "
          f"build_hnsw {x['py_build_s']['hnsw']:.1f}->{y['py_build_s']['hnsw']:.1f} | "
          f"bf {q('bf')} kd {q('kd')} hnsw {q('hnsw')} | "
          f"recall_same={x['py_recall'] == y['py_recall']} cpp_parity={ok}")
