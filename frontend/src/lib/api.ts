const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'order_app_token';

export type FieldErrors = Record<string, string[]>;

export type ApiMeta = {
  page: number;
  per_page: number;
  total: number;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
};

export class ApiError extends Error {
  readonly status: number;
  readonly errors: FieldErrors;

  constructor(status: number, message: string, errors: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function request<T>(path: string, options: RequestOptions = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    if (response.status === 401) {
      clearToken();
    }

    throw new ApiError(
      response.status,
      payload?.message ?? 'Terjadi kesalahan saat menghubungi server',
      payload?.errors ?? {},
    );
  }

  return payload as ApiEnvelope<T>;
}
