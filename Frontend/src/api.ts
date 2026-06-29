import type { ApiError } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY ?? 'dev-api-key';

export class ApiRequestError extends Error {
  status: number;
  body: ApiError | unknown;

  constructor(message: string, status: number, body: ApiError | unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  token?: string | null;
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', token, body, skipAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    headers['x-api-key'] = API_KEY;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorBody = data as ApiError;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : (errorBody?.message ?? response.statusText);
    throw new ApiRequestError(message, response.status, data);
  }

  return data as T;
}

export function getApiUrl(): string {
  return API_URL;
}
