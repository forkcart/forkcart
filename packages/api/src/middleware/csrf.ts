import crypto from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const CSRF_COOKIE = 'fc_csrf';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_BYTES = 32;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Paths exempt from CSRF checks:
 * - Webhook endpoints (called by external services, not browsers)
 */
const EXEMPT_PATH_PREFIXES = ['/api/v1/payments/webhook'];

/**
 * CSRF protection middleware using the Double-Submit Cookie pattern.
 *
 * 1. On every request, ensure a `fc_csrf` cookie exists (set one if missing).
 * 2. For state-changing methods (POST/PUT/PATCH/DELETE):
 *    a. Skip if the request carries a Bearer token (API auth is sufficient).
 *    b. Skip for webhook paths.
 *    c. Validate Origin/Referer against allowed origins.
 *    d. Validate the `x-csrf-token` header matches the cookie value.
 */
export function csrf(allowedOrigins: string[]) {
  const originSet = new Set(allowedOrigins.map((o) => o.replace(/\/+$/, '')));

  return async (c: Context, next: Next) => {
    // Ensure CSRF cookie exists
    let token = getCookie(c, CSRF_COOKIE);
    if (!token) {
      token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
      setCookie(c, CSRF_COOKIE, token, {
        httpOnly: false, // JS must read this to send it back as header
        sameSite: 'Lax',
        secure: c.req.url.startsWith('https'),
        path: '/',
      });
    }

    // Safe methods don't need CSRF validation
    if (SAFE_METHODS.has(c.req.method)) {
      return next();
    }

    // Skip CSRF for exempt paths (webhooks)
    const path = c.req.path;
    if (EXEMPT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    // Skip CSRF for requests with Bearer token auth (API-to-API, already authenticated)
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return next();
    }

    // ── Origin / Referer check ──────────────────────────────────────────
    const origin = c.req.header('Origin');
    const referer = c.req.header('Referer');

    if (origin) {
      if (!originSet.has(origin.replace(/\/+$/, ''))) {
        return c.json(
          { error: { code: 'CSRF_ORIGIN_MISMATCH', message: 'Origin not allowed' } },
          403,
        );
      }
    } else if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (!originSet.has(refOrigin.replace(/\/+$/, ''))) {
          return c.json(
            { error: { code: 'CSRF_REFERER_MISMATCH', message: 'Referer origin not allowed' } },
            403,
          );
        }
      } catch {
        return c.json(
          { error: { code: 'CSRF_INVALID_REFERER', message: 'Invalid Referer header' } },
          403,
        );
      }
    }
    // If neither Origin nor Referer is present, fall through to token check

    // ── Double-submit cookie token check ────────────────────────────────
    const headerToken = c.req.header(CSRF_HEADER);
    if (!headerToken || headerToken !== token) {
      return c.json(
        { error: { code: 'CSRF_TOKEN_MISMATCH', message: 'CSRF token missing or invalid' } },
        403,
      );
    }

    return next();
  };
}
