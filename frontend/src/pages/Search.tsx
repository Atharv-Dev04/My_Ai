import React from 'react';
import { Search } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const SearchPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="Semantic & Vector Search"
      description="Benchmark and compare BruteForce, KD-Tree, and HNSW graph traversal over query vectors."
      icon={Search}
      nextTaskNote="Connects to /vectors/query and /vectors/benchmark with algorithm selector and latency comparators."
    />
  );
};
