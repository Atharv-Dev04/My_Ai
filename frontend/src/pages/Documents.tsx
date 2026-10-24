import React from 'react';
import { FileText } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const DocumentsPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="Knowledge Documents"
      description="Document repository, chunk inspection, and persistent metadata management."
      icon={FileText}
      nextTaskNote="Connects to /documents endpoints with filtering, chunk view, and deletion."
    />
  );
};
