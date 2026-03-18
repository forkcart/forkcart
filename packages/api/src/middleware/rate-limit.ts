/**
 * Simple in-memory rate limiter middleware (RVS-016).
 * Keyed by IP address with sliding window.
 */
import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, RateLimitEntry>>();

/** Periodically clean expired entries every 5 minutes */
setInterval(
  () => {
    const now = Date.now();
    for (const [, map] of buckets) {
      for (const [key, entry] of map) {
        if (now > entry.resetAt) map.delete(key);
      }
    }
  },
  5 * 60 * 1000,
).unref();

function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown'
  );
}

/**
 * Create a rate-limit middleware.
 * @param name   Bucket name (e.g. "login", "payments")
 * @param max    Maximum requests per window
 * @param windowMs Window in milliseconds (default 60 000 = 1 min)
 */
export function rateLimit(name: string, max: number, windowMs = 60_000) {
  if (!buckets.has(name)) buckets.set(name, new Map());
  const store = buckets.get(name)!;

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(max - 1));
      await next();
      return;
    }

    entry.count++;
    const remaining = Math.max(0, max - entry.count);
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429);
    }

    await next();
  };
}
