import React from 'react';
import { MessageSquare } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const ChatPage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="RAG AI Chat"
      description="Interactive conversation with local Ollama LLMs augmented by retrieved document context."
      icon={MessageSquare}
      nextTaskNote="Connects to /rag/query and Ollama chat generation with retrieved citations."
    />
  );
};
