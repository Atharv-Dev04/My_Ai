// VectorMind Task 03 — C++ reference harness.
//
// Includes the UNMODIFIED original main.cpp (perryvegehan/Your-OWN-AI, MIT)
// with its main() renamed to original_main (macro scoped to the include), and
// drives the original BruteForce / KDTree / HNSW classes on a dataset file.
// Built with -fno-access-control so HNSW's private graph can be dumped.
//
// Build (from VectorMind/, original repo cloned at ../Your-OWN-AI):
//   g++ -std=c++17 -O2 -fno-access-control -I../Your-OWN-AI \
//       -o benchmarks/cpp_reference/harness.exe \
//       benchmarks/cpp_reference/harness.cpp -lws2_32
//
// Usage: harness <data.txt> <queries.txt> <metric> <k> <ef> <out.txt> [reps]
//   data.txt    : "n dims" then n rows of floats (ids are 1..n in order)
//   queries.txt : "nq dims" then nq rows of floats
//   out.txt     : results (see below)
#define main original_main
#include "main.cpp"
#undef main

#include <cstdio>

static std::vector<std::vector<float>> readMat(const char* path, int& dims) {
    FILE* f = std::fopen(path, "r");
    if (!f) { std::fprintf(stderr, "cannot open %s\n", path); std::exit(2); }
    int n; if (std::fscanf(f, "%d %d", &n, &dims) != 2) std::exit(2);
    std::vector<std::vector<float>> m(n, std::vector<float>(dims));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < dims; j++) {
            float x; if (std::fscanf(f, "%f", &x) != 1) std::exit(2);
            m[i][j] = x;
        }
    std::fclose(f);
    return m;
}

using Clock = std::chrono::steady_clock;
static long long ns(Clock::time_point a, Clock::time_point b) {
    return std::chrono::duration_cast<std::chrono::nanoseconds>(b - a).count();
}

static void dumpRes(FILE* o, const char* tag, int qi,
                    const std::vector<std::pair<float,int>>& r) {
    std::fprintf(o, "R %s %d", tag, qi);
    for (auto& p : r) std::fprintf(o, " %.9g:%d", p.first, p.second);
    std::fprintf(o, "\n");
}

int main(int argc, char** argv) {
    if (argc < 7) { std::fprintf(stderr, "usage: harness data queries metric k ef out [reps]\n"); return 2; }
    int dims, qdims;
    auto data = readMat(argv[1], dims);
    auto qs   = readMat(argv[2], qdims);
    std::string metric = argv[3];
    int k = std::atoi(argv[4]), ef = std::atoi(argv[5]);
    int reps = argc > 7 ? std::atoi(argv[7]) : 1;
    DistFn dist = getDistFn(metric);
    FILE* o = std::fopen(argv[6], "w");

    BruteForce bf; KDTree kd(dims); HNSW hn(16, 200);
    std::vector<VectorItem> items;
    for (size_t i = 0; i < data.size(); i++)
        items.push_back({(int)i + 1, "m", "c", data[i]});

    auto t0 = Clock::now(); for (auto& v : items) bf.insert(v);
    auto t1 = Clock::now(); for (auto& v : items) kd.insert(v);
    auto t2 = Clock::now(); for (auto& v : items) hn.insert(v, dist);
    auto t3 = Clock::now();
    std::fprintf(o, "T build_bf_ns %lld\nT build_kd_ns %lld\nT build_hnsw_ns %lld\n",
                 ns(t0,t1), ns(t1,t2), ns(t2,t3));

    // HNSW structure: levels and neighbour lists (insertion order preserved)
    std::fprintf(o, "H top %d entry %d\n", hn.topLayer, hn.entryPt);
    for (size_t i = 0; i < data.size(); i++) {
        int id = (int)i + 1; auto& nd = hn.G[id];
        std::fprintf(o, "L %d %d\n", id, nd.maxLyr);
        for (size_t lc = 0; lc < nd.nbrs.size(); lc++) {
            std::fprintf(o, "N %d %zu", id, lc);
            for (int x : nd.nbrs[lc]) std::fprintf(o, " %d", x);
            std::fprintf(o, "\n");
        }
    }

    for (size_t qi = 0; qi < qs.size(); qi++) {
        dumpRes(o, "bf", (int)qi, bf.knn(qs[qi], k, dist));
        dumpRes(o, "kd", (int)qi, kd.knn(qs[qi], k, dist));
        dumpRes(o, "hnsw", (int)qi, hn.knn(qs[qi], k, ef, dist));
    }

    // Query timing: reps passes over all queries; per-query min-free samples
    for (int r = 0; r < reps; r++)
        for (size_t qi = 0; qi < qs.size(); qi++) {
            auto a = Clock::now(); auto x = bf.knn(qs[qi], k, dist);
            auto b = Clock::now(); auto y = kd.knn(qs[qi], k, dist);
            auto c = Clock::now(); auto z = hn.knn(qs[qi], k, ef, dist);
            auto d = Clock::now();
            volatile size_t sink = x.size() + y.size() + z.size(); (void)sink;
            std::fprintf(o, "Q %zu %lld %lld %lld\n", qi, ns(a,b), ns(b,c), ns(c,d));
        }
    std::fclose(o);
    return 0;
}
