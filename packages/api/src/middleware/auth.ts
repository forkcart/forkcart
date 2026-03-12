import type { Context, Next } from 'hono';
import type { AuthService, AuthUser } from '@forkcart/core';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/health', '/api/v1/auth/login', '/uploads', '/sitemap.xml', '/robots.txt'];

/** Extend Hono context with auth user */
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    token: string;
  }
}

/** Create auth middleware that protects routes */
export function createAuthMiddleware(authService: AuthService) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip auth for public paths
    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
      return next();
    }

    // Also skip for storefront API routes (they use different auth)
    if (path.startsWith('/api/v1/storefront')) {
      return next();
    }

    // Cart routes are public (session-based, no login required)
    if (path.startsWith('/api/v1/carts')) {
      return next();
    }

    // Customer auth routes are public (storefront login/register)
    if (path.startsWith('/api/v1/customer-auth')) {
      return next();
    }

    // Public search routes (search, suggestions, popular)
    if (
      path.startsWith('/api/v1/search') &&
      !path.includes('/analytics') &&
      !path.includes('/zero-results')
    ) {
      return next();
    }

    // Payment routes are public (storefront checkout)
    if (path.startsWith('/api/v1/payments')) {
      return next();
    }

    // Shipping method listing is public (storefront checkout)
    if (path.startsWith('/api/v1/shipping/methods') && c.req.method === 'GET') {
      return next();
    }

    // Chat routes are public (storefront chatbot) — admin routes are NOT
    if (path.startsWith('/api/v1/chat') && !path.startsWith('/api/v1/chat/admin')) {
      return next();
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } },
        401,
      );
    }

    const token = authHeader.slice(7);

    try {
      const user = await authService.verifyToken(token);
      c.set('user', user);
      c.set('token', token);
      return next();
    } catch {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
  };
}
