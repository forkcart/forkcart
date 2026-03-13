import type { Context, Next } from 'hono';

/** Valid admin roles */
export type AdminRole = 'superadmin' | 'admin' | 'editor';

/**
 * Middleware that restricts access to users with one of the specified roles.
 * Must be used AFTER the auth middleware (expects `c.get('user')` to be set).
 *
 * @example
 * router.post('/', requireRole('superadmin'), handler)
 * router.delete('/:id', requireRole('admin', 'superadmin'), handler)
 */
export function requireRole(...roles: AdminRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    if (!roles.includes(user.role as AdminRole)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    return next();
  };
}
