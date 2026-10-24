export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('vectormind_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetails: unknown = null;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      const message =
        typeof errorDetails === 'object' && errorDetails && 'detail' in errorDetails
          ? String((errorDetails as { detail: unknown }).detail)
          : `HTTP error ${response.status}: ${response.statusText}`;

      const error: ApiError = {
        message,
        status: response.status,
        details: errorDetails,
      };
      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if ((err as ApiError).status !== undefined) {
      throw err;
    }
    const networkError: ApiError = {
      message: (err as Error).message || 'Network request failed. Is the API server running?',
    };
    throw networkError;
  }
}

// ── System & Health Endpoints ─────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  version?: string;
}

export interface StatusResponse {
  ollama_available: boolean;
  embed_model: string;
  gen_model: string;
  doc_count: number;
  doc_dims: number;
  demo_dims: number;
  demo_count: number;
}

export const checkApiHealth = (): Promise<HealthResponse> => {
  return apiClient<HealthResponse>('/health');
};

export const getSystemStatus = (): Promise<StatusResponse> => {
  return apiClient<StatusResponse>('/status');
};

// ── Document Endpoints ────────────────────────────────────────────────────
export interface DocListItem {
  id: number;
  title: string;
  preview: string;
  words: number;
  page_number?: number | null;
  chunk_index?: number;
}

export interface FileIngestResponse {
  filename: string;
  file_type: string;
  size_bytes: number;
  chunks_created: number;
  chunk_ids: number[];
  dims: number;
  pages_detected?: number | null;
}

export const getDocuments = (): Promise<DocListItem[]> => {
  return apiClient<DocListItem[]>('/documents');
};

export const deleteDocument = (id: number): Promise<void> => {
  return apiClient<void>(`/documents/${id}`, { method: 'DELETE' });
};

export const uploadDocument = (file: File): Promise<FileIngestResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient<FileIngestResponse>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
};

// ── Vector Endpoints ──────────────────────────────────────────────────────
export interface VectorStats {
  count: number;
  dims: number;
  algorithms: string[];
  metrics: string[];
}

export interface VectorListItem {
  id: number;
  metadata: string;
  category: string;
  embedding: number[];
}

export interface HNSWInfo {
  top_layer: number;
  node_count: number;
  nodes_per_layer: Record<string, number>;
  edges_per_layer: Record<string, number>;
}

export const getVectorStats = (): Promise<VectorStats> => {
  return apiClient<VectorStats>('/vectors/stats');
};

export const getVectors = (): Promise<VectorListItem[]> => {
  return apiClient<VectorListItem[]>('/vectors');
};

export const getHNSWInfo = (): Promise<HNSWInfo> => {
  return apiClient<HNSWInfo>('/vectors/hnsw-info');
};

export const loadDemoVectors = (): Promise<{ id: number }> => {
  return apiClient<{ id: number }>('/vectors/load-demo', { method: 'POST' });
};

// ── Search Endpoints ──────────────────────────────────────────────────────
export interface ContextChunk {
  id: number;
  title: string;
  text: string;
  distance: number;
  page_number?: number | null;
  chunk_index?: number;
}

export interface DocSearchResponse {
  query: string;
  contexts: ContextChunk[];
  latency_ms: number;
  total_chunks_scanned: number;
}

export const searchDocuments = (question: string, k: number = 5): Promise<DocSearchResponse> => {
  return apiClient<DocSearchResponse>('/documents/search', {
    method: 'POST',
    body: JSON.stringify({ question, k }),
  });
};

export interface SearchHit {
  id: number;
  metadata: string;
  category: string;
  distance: number;
  embedding: number[];
}

export interface VectorSearchResponse {
  results: SearchHit[];
  latency_us: number;
  algo: string;
  metric: string;
}

export const searchVectors = (
  embedding: number[],
  k: number = 5,
  metric: string = 'cosine',
  algo: string = 'hnsw'
): Promise<VectorSearchResponse> => {
  return apiClient<VectorSearchResponse>('/vectors/search', {
    method: 'POST',
    body: JSON.stringify({ embedding, k, metric, algo }),
  });
};

// ── RAG Generation Endpoint ───────────────────────────────────────────────
export interface RagAskResponse {
  answer: string;
  model: string;
  contexts: ContextChunk[];
  doc_count: number;
}

export const ragAsk = (question: string, k: number = 3): Promise<RagAskResponse> => {
  return apiClient<RagAskResponse>('/rag/ask', {
    method: 'POST',
    body: JSON.stringify({ question, k }),
  });
};

// ── Auth & Conversation Persistence Endpoints ──────────────────────────────
export interface UserProfile {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface MessageItem {
  id: number;
  conversation_id: number;
  sender: 'user' | 'assistant';
  content: string;
  citations: ContextChunk[] | null;
  created_at: string;
}

export interface ConversationDetail {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: MessageItem[];
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export const registerUser = (
  email: string,
  password: string,
  fullName?: string
): Promise<UserProfile> =>
  apiClient<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName || null }),
  });

export const loginUser = (email: string, password: string): Promise<AuthTokenResponse> =>
  apiClient<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = (): Promise<UserProfile> => apiClient<UserProfile>('/auth/me');

export const listConversations = (): Promise<ConversationSummary[]> =>
  apiClient<ConversationSummary[]>('/conversations');

export const getConversation = (id: number): Promise<ConversationDetail> =>
  apiClient<ConversationDetail>(`/conversations/${id}`);

export const createConversation = (title?: string): Promise<ConversationSummary> =>
  apiClient<ConversationSummary>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'New Conversation' }),
  });

export const deleteConversation = (id: number): Promise<void> =>
  apiClient<void>(`/conversations/${id}`, { method: 'DELETE' });

export const appendMessage = (
  conversationId: number,
  sender: 'user' | 'assistant',
  content: string,
  citations?: ContextChunk[]
): Promise<MessageItem> =>
  apiClient<MessageItem>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ sender, content, citations: citations || null }),
  });
