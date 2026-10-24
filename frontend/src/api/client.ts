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

// Health check utility
export interface HealthResponse {
  status: string;
  version?: string;
  vector_db?: {
    items: number;
    dims: number;
  };
}

export const checkApiHealth = (): Promise<HealthResponse> => {
  return apiClient<HealthResponse>('/system/health');
};
