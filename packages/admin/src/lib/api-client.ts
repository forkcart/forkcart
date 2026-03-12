const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

/** Typed fetch wrapper for the ForkCart API */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${path}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    throw new Error(error.error?.message ?? `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
