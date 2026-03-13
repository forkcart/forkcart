import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthService } from '@forkcart/core';
import { AuthError } from '@forkcart/core';
import { requireRole } from '../../middleware/permissions';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['superadmin', 'admin', 'editor']),
  isActive: z.boolean().optional(),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['superadmin', 'admin', 'editor']).optional(),
  isActive: z.boolean().optional(),
});

const ChangePasswordSchema = z.object({
  password: z.string().min(8),
});

const UpdateProfileSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

/** User management routes */
export function createUserRoutes(authService: AuthService) {
  const router = new Hono();

  // ─── My Account (any authenticated user) ──────────────────────────────────

  /** GET /users/me — Get own profile */
  router.get('/me', async (c) => {
    const currentUser = c.get('user');
    const user = await authService.getUser(currentUser.id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    return c.json({ data: user });
  });

  /** PUT /users/me — Update own profile (name, email only — no role change) */
  router.put('/me', async (c) => {
    const currentUser = c.get('user');
    const body = await c.req.json();
    const input = UpdateProfileSchema.parse(body);

    try {
      const updated = await authService.updateUser(currentUser.id, input, currentUser.id);
      return c.json({ data: updated });
    } catch (error) {
      if (error instanceof AuthError) {
        return c.json({ error: { code: error.code, message: error.message } }, 400);
      }
      throw error;
    }
  });

  /** PUT /users/me/password — Change own password */
  router.put('/me/password', async (c) => {
    const currentUser = c.get('user');
    const body = await c.req.json();
    const { password } = ChangePasswordSchema.parse(body);

    try {
      await authService.changePassword(currentUser.id, password);
      return c.json({ data: { message: 'Password changed successfully' } });
    } catch (error) {
      if (error instanceof AuthError) {
        return c.json({ error: { code: error.code, message: error.message } }, 400);
      }
      throw error;
    }
  });

  // ─── User Management (superadmin only) ────────────────────────────────────

  /** GET /users — List all users */
  router.get('/', requireRole('superadmin'), async (c) => {
    const users = await authService.listUsers();
    return c.json({ data: users });
  });

  /** POST /users — Create a new user */
  router.post('/', requireRole('superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateUserSchema.parse(body);

    try {
      const user = await authService.createUser(input);
      return c.json({ data: user }, 201);
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'EMAIL_EXISTS' ? 409 : 400;
        return c.json({ error: { code: error.code, message: error.message } }, status);
      }
      throw error;
    }
  });

  /** GET /users/:id — Get user details */
  router.get('/:id', requireRole('superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const user = await authService.getUser(id);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    return c.json({ data: user });
  });

  /** PUT /users/:id — Update user */
  router.put('/:id', requireRole('superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const currentUser = c.get('user');
    const body = await c.req.json();
    const input = UpdateUserSchema.parse(body);

    try {
      const updated = await authService.updateUser(id, input, currentUser.id);
      return c.json({ data: updated });
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
        return c.json({ error: { code: error.code, message: error.message } }, status);
      }
      throw error;
    }
  });

  /** DELETE /users/:id — Delete user */
  router.delete('/:id', requireRole('superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const currentUser = c.get('user');

    try {
      await authService.deleteUser(id, currentUser.id);
      return c.json({ data: { message: 'User deleted successfully' } });
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
        return c.json({ error: { code: error.code, message: error.message } }, status);
      }
      throw error;
    }
  });

  /** PUT /users/:id/password — Change user password (superadmin OR own account) */
  router.put('/:id/password', async (c) => {
    const id = c.req.param('id') as string;
    const currentUser = c.get('user');

    // Allow if superadmin OR changing own password
    if (currentUser.role !== 'superadmin' && currentUser.id !== id) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    const body = await c.req.json();
    const { password } = ChangePasswordSchema.parse(body);

    try {
      await authService.changePassword(id, password);
      return c.json({ data: { message: 'Password changed successfully' } });
    } catch (error) {
      if (error instanceof AuthError) {
        return c.json({ error: { code: error.code, message: error.message } }, 400);
      }
      throw error;
    }
  });

  return router;
}
