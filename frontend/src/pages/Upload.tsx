import React from 'react';
import { Upload } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const UploadPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="Document Ingestion & Upload"
      description="Upload textual files or raw markdown for chunking, embedding generation, and vector index insertion."
      icon={Upload}
      nextTaskNote="Connects to /documents/upload multipart and batch ingestion pipelines."
    />
  );
};
