/**
 * API Client for backend communication
 * Handles authentication headers, token management, and common HTTP operations
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

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

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return API_BASE_URL;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
    const url = `${API_BASE_URL}${endpoint}`;
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
