import { getToken, removeToken } from './auth';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

/** Typed fetch wrapper for the ForkCart API */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${path}`;

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    // Token invalid/expired — clear and redirect to login
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    throw new Error(error.error?.message ?? `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
