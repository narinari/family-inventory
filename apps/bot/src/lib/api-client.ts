import type { User } from '@family-inventory/shared';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

interface GetUserByDiscordIdResponse {
  user: User;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json() as ApiResponse<T>;
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    const response = await this.get<GetUserByDiscordIdResponse>(`/auth/discord/user/${discordId}`);
    if (response.success && response.data) {
      return response.data.user;
    }
    return null;
  }
}

// Factory function for creating configured API client
export function createApiClient(): ApiClient {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080';
  const apiKey = process.env.BOT_API_KEY;

  return new ApiClient({ baseUrl, apiKey });
}

export const apiClient = createApiClient();
