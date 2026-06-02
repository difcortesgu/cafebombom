/**
 * API Client for backend communication
 * Handles authentication headers, token management, and common HTTP operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL_FALLBACK = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
export const API_BASE_URL_STORAGE_KEY = 'settings.api-base-url';

function isWeb(): boolean {
  return typeof window !== 'undefined' && Platform.OS === 'web';
}

function normalizeApiBaseUrl(input: string): string {
  const raw = input.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const parsed = new URL(withProtocol);
  const pathname = parsed.pathname.replace(/\/+$/, '');
  const nextPathname = pathname === '' || pathname === '/' ? '/api' : pathname.endsWith('/api') ? pathname : `${pathname}/api`;
  return `${parsed.origin}${nextPathname}`;
}

async function readStoredApiBaseUrl(): Promise<string | null> {
  try {
    if (isWeb()) {
      return window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
    }

    return await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function writeStoredApiBaseUrl(value: string | null): Promise<void> {
  try {
    if (isWeb()) {
      if (!value) {
        window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, value);
      return;
    }

    if (!value) {
      await AsyncStorage.removeItem(API_BASE_URL_STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, value);
  } catch {
    // Ignore persistence errors to keep API calls functional.
  }
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

type RequestOptions = {
  headers?: Record<string, string>;
  body?: unknown;
};

type DownloadedFile = {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string | null;
  fileName: string;
};

class ApiClient {
  private token: string | null = null;
  private baseUrl = normalizeApiBaseUrl(API_BASE_URL_FALLBACK);
  private baseUrlHydrated = false;

  async hydrateBaseUrl(): Promise<void> {
    if (this.baseUrlHydrated) {
      return;
    }

    const stored = await readStoredApiBaseUrl();
    if (stored) {
      try {
        this.baseUrl = normalizeApiBaseUrl(stored);
      } catch {
        this.baseUrl = normalizeApiBaseUrl(API_BASE_URL_FALLBACK);
      }
    }

    this.baseUrlHydrated = true;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = normalizeApiBaseUrl(baseUrl);
  }

  async persistBaseUrl(baseUrl: string): Promise<void> {
    const normalized = normalizeApiBaseUrl(baseUrl);
    this.baseUrl = normalized;
    await writeStoredApiBaseUrl(normalized);
  }

  async resetBaseUrl(): Promise<void> {
    this.baseUrl = normalizeApiBaseUrl(API_BASE_URL_FALLBACK);
    await writeStoredApiBaseUrl(null);
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      if (isJson) {
        try {
          const error = await response.json() as { error?: string; message?: string };
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
      }

      throw new Error(errorMessage);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as unknown as T;
    }

    if (!isJson) {
      throw new Error('Invalid response format');
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    return this.handleResponse<T>(response);
  }

  async uploadFile<T>(endpoint: string, file: Uint8Array, fileName: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    // Force an ArrayBuffer-backed copy to satisfy strict BlobPart typing.
    const fileCopy = new Uint8Array(file);
    const blob = new Blob([fileCopy.buffer]);
    formData.append('file', blob, fileName);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
        ...options?.headers,
      } as Record<string, string>,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  async downloadFile(endpoint: string, fallbackFileName: string, options?: RequestOptions): Promise<DownloadedFile> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const error = await response.json() as { error?: string; message?: string };
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
      }

      throw new Error(errorMessage);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const match = contentDisposition.match(/filename="?([^\";]+)"?/i);
    const fileName = match?.[1] || fallbackFileName;

    return {
      bytes: new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>,
      contentType: response.headers.get('content-type'),
      fileName,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
