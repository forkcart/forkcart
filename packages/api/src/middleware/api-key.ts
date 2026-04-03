/**
 * API Key authentication middleware.
 *
 * Checks X-Api-Key header or Authorization: Bearer fc_live_... tokens.
 * If a valid API key is found, sets c.user (same interface as JWT auth).
 * Includes per-key rate limiting (100 req/min).
 */
import type { Context, Next } from 'hono';
import type { Database } from '@forkcart/database';
import { apiKeys, users, eq, and, sql } from '@forkcart/database';
import bcrypt from 'bcryptjs';

const API_KEY_PREFIX = 'fc_live_';

/** In-memory rate limiter per API key (by key id) */
interface RateEntry {
  count: number;
  resetAt: number;
}
const keyRateLimits = new Map<string, RateEntry>();

setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of keyRateLimits) {
      if (now > v.resetAt) keyRateLimits.delete(k);
    }
  },
  5 * 60 * 1000,
).unref();

/** Extract an API key from the request (header or bearer token) */
function extractApiKey(c: Context): string | null {
  // Check X-Api-Key header first
  const xApiKey = c.req.header('X-Api-Key');
  if (xApiKey?.startsWith(API_KEY_PREFIX)) return xApiKey;

  // Check Authorization: Bearer fc_live_...
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ' + API_KEY_PREFIX)) {
    return auth.slice(7);
  }

  return null;
}

/**
 * Create middleware that authenticates via API key.
 * Should run BEFORE the JWT auth middleware — if a key is found & valid,
 * it sets c.user so the JWT middleware can skip.
 */
export function createApiKeyMiddleware(db: Database) {
  return async (c: Context, next: Next) => {
    const rawKey = extractApiKey(c);
    if (!rawKey) return next(); // No API key — fall through to JWT auth

    // Find all non-expired keys and check hashes
    const allKeys = await db
      .select({
        id: apiKeys.id,
        keyHash: apiKeys.keyHash,
        userId: apiKeys.userId,
        permissions: apiKeys.permissions,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.prefix, rawKey.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + 8)),
          sql`(${apiKeys.expiresAt} IS NULL OR ${apiKeys.expiresAt} > NOW())`,
        ),
      );

    let matchedKey: (typeof allKeys)[number] | null = null;
    for (const k of allKeys) {
      if (await bcrypt.compare(rawKey, k.keyHash)) {
        matchedKey = k;
        break;
      }
    }

    if (!matchedKey) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired API key' } },
        401,
      );
    }

    // Rate limit: 100 req/min per key
    const now = Date.now();
    const windowMs = 60_000;
    const maxReqs = 100;
    let entry = keyRateLimits.get(matchedKey.id);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      keyRateLimits.set(matchedKey.id, entry);
    } else {
      entry.count++;
    }

    c.header('X-RateLimit-Limit', '100');
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxReqs - entry.count)));

    if (entry.count > maxReqs) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'API key rate limit exceeded' } },
        429,
      );
    }

    // Fetch user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, matchedKey.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'API key owner not found' } }, 401);
    }

    // Set user on context (same interface as JWT auth)
    c.set('user', user);
    c.set('token', 'apikey');

    // Update lastUsedAt asynchronously (fire-and-forget)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, matchedKey.id))
      .then(() => {})
      .catch(() => {});

    return next();
  };
}
