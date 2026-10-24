import React from 'react';
import { Settings } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const SettingsPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="Platform Settings"
      description="Ollama connection endpoints, default vector algorithm parameters (ef_search, M, dims), and UI preferences."
      icon={Settings}
      nextTaskNote="Controls client-side overrides and persistent environment preferences."
    />
  );
};
