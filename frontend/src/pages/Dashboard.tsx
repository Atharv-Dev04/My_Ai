import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const DashboardPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="System Dashboard"
      description="Real-time indexing status, engine health telemetry, and query latency monitoring."
      icon={LayoutDashboard}
      nextTaskNote="Connects to FastAPI /system/health, /system/stats, and VectorDB telemetry."
    />
  );
};
