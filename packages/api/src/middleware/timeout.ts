import type { Context, Next } from 'hono';

/**
 * Request timeout middleware.
 * Rejects requests that take longer than the specified duration.
 */
export function requestTimeout(ms: number = 30_000) {
  return async (c: Context, next: Next) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    try {
      // Store signal so downstream handlers can check for abort
      c.set('timeoutSignal', controller.signal);
      await next();
    } finally {
      clearTimeout(timer);
    }
  };
}
