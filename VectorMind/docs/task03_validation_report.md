# Task 03 — Migration Validation Report

All numbers below were measured on the machine described here; none are
estimated. Raw data: `benchmarks/results/parity.json`, `benchmarks/results/bench.json`.

## Environment
- CPU: 12th Gen Intel Core i5-12500H (12 cores/16 threads reported by OS), 15.7 GB RAM
- Windows, Python 3.11.9, NumPy (see bench.json), g++ (MSYS2 UCRT64) `-O2 -std=c++17`
- C++ reference = **unmodified** `Your-OWN-AI/main.cpp` included by
  `benchmarks/cpp_reference/harness.cpp` (`main` renamed inside the include,
  `-fno-access-control` only to dump HNSW's private graph).

## Defects found and fixed (all measured before fixing)
| # | Defect | Evidence | Fix |
|---|--------|----------|-----|
| 1 | HNSW level RNG differed from C++ (`random.Random` vs `mt19937`) | 51/500 levels differed; HNSW results differed from C++ on clustered data (6–15 of 50 queries) | `engine/_mt19937.py`: exact `mt19937` + libstdc++ `uniform_real_distribution<float>`; float32 `mL`/log |
| 2 | Heap tie-break opposite of C++ (`(-d, id)` vs max-heap on `(d, id)`) | KD-Tree id lists differed from C++ on 29/50, 5/50, 37/50 queries (grid_ties) | heaps keyed `(-d, -id)` in KDTree and HNSW |
| 3 | `KDTree.knn(k=0)` raised `IndexError` (C++: undefined behaviour) | reproduced | returns `[]` |
| 4 | `KDTree` recursion → `RecursionError` at depth ≈ 997 (e.g. ~1000 duplicate points) | reproduced | iterative insert and search, same visit order |
| 5 | NumPy `dot`/`sum` accumulation order differs from C++ sequential float32 loops | after 1–2: cosine neighbour lists differed (5/534, 53/534) and 2 KD id lists differed in a test | sequential float32 accumulation (`cumsum`) in all three metrics |

## Parity with C++ (after fixes)
`python -m benchmarks.run_parity` — n=500, d=16, 50 queries, k=10, ef=50, seeds 1/2;
3 datasets × 3 metrics = 9 runs:
- HNSW levels, top layer, entry point: **0 mismatches**
- HNSW neighbour lists: **0 / 534 mismatches** in every run
- BruteForce / KD-Tree / HNSW id lists: **0 mismatches** in every run
- Max relative distance difference ≤ 5e-9 (text round-trip at `%.9g`)

Not verified: `unordered_map` iteration order (affects `HNSW.remove` entry-point
choice and `VectorDB.remove` KD rebuild order) is unspecified in C++ and cannot
be compared; MSVC/libc++ RNG output may differ from libstdc++.

## Benchmark — BEFORE optimization (`benchmarks/results/bench_before_opt.json`)
k=10, ef=50, 100 held-out queries × 3 reps = 300 latency samples per cell.
Build time: Python = 1 build; C++ = median of 3 harness runs. Latency in µs (median / p95).

| Config (metric) | Algo | Python | C++ |
|---|---|---|---|
| uniform n=1000 d=16 (euclid) | BF | 2936 / 3189 | 37 / 49 |
| | KD | 3418 / 3752 | 25 / 38 |
| | HNSW | 1796 / 2039 | 61 / 100 |
| clustered n=5000 d=16 (euclid) | BF | 15278 / 16083 | 238 / 292 |
| | KD | 2212 / 2784 | 35 / 60 |
| | HNSW | 1353 / 1613 | 73 / 116 |
| clustered n=2000 d=128 (euclid) | BF | 6368 / 6866 | 155 / 172 |
| | KD | 5950 / 7041 | 122 / 141 |
| | HNSW | 891 / 1010 | 65 / 77 |

HNSW build (s): uniform 1000×16: Python 5.1 vs C++ 0.118; clustered 5000×16: 22.2 vs 0.636;
clustered 2000×128: 8.1 vs 0.268. (Cosine builds: 11.3 / 47.5 / 18.5 s Python.)
Full table incl. cosine: `bench.json`. Python is roughly 10–100× slower on queries and
~40–80× slower on HNSW build; this is the cost of pure-Python per-pair distance calls.

### Recall@10 vs exact brute force (Python = C++ in every cell)
| Config | Metric | KD-Tree | HNSW |
|---|---|---|---|
| uniform 1000×16 | euclid | 1.000 | 1.000 |
| uniform 1000×16 | cosine | **0.359** | 0.998 |
| clustered 5000×16 | euclid | 1.000 | **0.593** |
| clustered 5000×16 | cosine | **0.130** | 0.596 |
| clustered 2000×128 | euclid | 1.000 | 0.721 |
| clustered 2000×128 | cosine | **0.122** | 0.597 |

## Inherited limitations (identical in the original C++; not "fixed" to preserve fidelity)
1. **KD-Tree under cosine is not exact** (recall 0.12–0.36). Pruning uses
   `|axis diff| < worst`, which is only a valid bound for euclidean/manhattan.
   KD-Tree is exact for those two metrics (recall 1.000 measured, euclidean).
   Manhattan recall was not benchmarked here (only parity-tested vs C++).
2. **HNSW recall on tightly clustered data is low** (0.59 at ef=50) and
   barely improves with larger ef (C++ ef sweep: 50→0.5930, 100/200/400→0.5940).
   Since ef does not help, the cause is graph structure, not beam width. Hypothesis
   (not tested): nearest-M neighbour selection without a diversity heuristic keeps
   clusters weakly connected. Needs a separate, explicitly approved task.
3. KD-Tree ids at the k-th tie boundary are unspecified (strict `<` admission);
   distances are exact. Matches C++ (0 id mismatches).
4. `HNSW.remove` does not repair the graph or update `topLayer` (D4, as C++).

## Profile (cProfile, HNSW euclidean, n=1000, d=16)
- Build (300 inserts, 1.86 s profiled): 333,011 `euclidean` calls take 1.50 s cumulative
  (~80%); `_seq_sum`/`cumsum` wrapper overhead is 0.84 s of that.
- Query (50 queries, 0.17 s): 27,516 distance calls = 0.126 s (~73%).
- Conclusion: time is per-call distance overhead, not algorithmic. **No optimization
  was applied in this task.** Candidate follow-up (parity tests guard it): batch
  distance evaluation per neighbour list / skip `asarray` for float32 inputs.
  Any batching must keep sequential float32 accumulation or parity is lost.

## Optimization (distance batching) — measured
Changes: batched distance functions in `metrics.py` (`get_batch_fn`), used by
`HNSW._search_layer`/neighbour pruning and a cached-matrix `BruteForce.knn`;
faster scalar `_seq_sum`. Batch results are **bit-identical** to the scalar path
(`cumsum(axis=1)` keeps strict left-to-right float32 accumulation; verified with
exact `==` in `tests/test_batch_metrics.py`, including HNSW graphs built via the
batch vs per-pair fallback path). KD-Tree traversal is inherently one distance per
node and only benefits from the faster scalar path. Custom distance functions use
the per-pair fallback. `BruteForce` caches a matrix invalidated by
`insert`/`remove`; direct external mutation of `.items` with an unchanged length
is not detected (nothing in the repo does this).

Same benchmark, same machine and seeds (`python -m benchmarks.run_bench`, then
`python benchmarks/compare_runs.py`). Python median query µs and HNSW build s, before → after:

| Config | Metric | HNSW build s | BF | KD | HNSW query |
|---|---|---|---|---|---|
| uniform 1000×16 | euclid | 5.1→2.0 | 2936→87 | 3418→2912 | 1796→911 |
| uniform 1000×16 | cosine | 11.3→3.1 | 7013→112 | 531→419 | 3866→1282 |
| clustered 5000×16 | euclid | 22.2→7.7 | 15278→469 | 2212→1773 | 1353→737 |
| clustered 5000×16 | cosine | 47.5→11.2 | 34684→537 | 206→160 | 2614→1106 |
| clustered 2000×128 | euclid | 8.1→3.0 | 6368→1187 | 5950→5164 | 891→625 |
| clustered 2000×128 | cosine | 18.5→4.4 | 15161→1369 | 182→151 | 1885→914 |

Recall is unchanged in all 6 configs and C++ parity (levels, neighbour lists,
id lists) still holds in the benchmark's own parity check and in the 9-run
`run_parity`. Timings are single-machine, single-process, 300 samples per cell;
run-to-run noise was not separately quantified. Python remains slower than C++
(e.g. HNSW build 5000×16 euclid: 7.7 s vs 0.64 s; HNSW query 737 µs vs 73 µs).
Remaining cost is per-call Python/NumPy overhead; a further speed-up would need
contiguous node storage or a compiled extension, which is out of scope here.

## Commands
```
# build C++ reference (from VectorMind/, original repo at ../Your-OWN-AI)
g++ -std=c++17 -O2 -fno-access-control -I../Your-OWN-AI -o benchmarks/cpp_reference/harness.exe benchmarks/cpp_reference/harness.cpp -lws2_32
python -m pytest tests -q
python -m benchmarks.run_parity
python -m benchmarks.run_bench
```
