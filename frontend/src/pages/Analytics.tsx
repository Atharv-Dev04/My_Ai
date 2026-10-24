import React from 'react';
import { BarChart3 } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const AnalyticsPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="Performance Analytics"
      description="Recall benchmarks, query latency percentiles (p50/p95), and index build times."
      icon={BarChart3}
      nextTaskNote="Incorporates Recharts visualization over live benchmark and telemetry datasets."
    />
  );
};
