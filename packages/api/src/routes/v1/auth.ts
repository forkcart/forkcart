import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthService } from '@forkcart/core';
import { AuthError } from '@forkcart/core';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(500),
});

export function createAuthRoutes(authService: AuthService) {
  const router = new Hono();

  /** POST /auth/login — Authenticate with email + password */
  router.post('/login', async (c) => {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    try {
      const result = await authService.login(email, password, {
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });

      return c.json({
        data: {
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'ACCOUNT_DISABLED' ? 403 : 401;
        return c.json({ error: { code: error.code, message: error.message } }, status);
      }
      throw error;
    }
  });

  /** POST /auth/logout — Invalidate current session */
  router.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      await authService.logout(authHeader.slice(7));
    }

    return c.json({ data: { message: 'Logged out successfully' } });
  });

  /** GET /auth/me — Get current authenticated user */
  router.get('/me', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    return c.json({ data: { user } });
  });

  return router;
}
