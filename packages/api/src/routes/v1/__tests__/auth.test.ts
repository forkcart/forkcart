import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createCustomerAuthRoutes } from '../customer-auth';
import type { CustomerAuthService } from '@forkcart/core';
import { UnauthorizedError, ConflictError, ValidationError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function fakeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    email: 'customer@shop.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    acceptsMarketing: false,
    orderCount: 0,
    totalSpent: 0,
    createdAt: new Date('2026-03-19T12:00:00Z'),
    updatedAt: new Date('2026-03-19T12:00:00Z'),
    ...overrides,
  };
}

function createMockCustomerAuthService() {
  return {
    register: vi.fn().mockResolvedValue({
      customer: fakeCustomer(),
      token: 'jwt-token-123',
      expiresAt: new Date('2026-03-22T12:00:00Z'),
    }),
    login: vi.fn().mockResolvedValue({
      customer: fakeCustomer(),
      token: 'jwt-token-456',
      expiresAt: new Date('2026-03-22T12:00:00Z'),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getProfile: vi.fn().mockResolvedValue(fakeCustomer()),
    updateProfile: vi.fn().mockResolvedValue(fakeCustomer({ firstName: 'Updated' })),
    changePassword: vi.fn().mockResolvedValue(undefined),
    forgotPassword: vi.fn().mockResolvedValue({ message: 'Reset link sent' }),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockReturnValue({
      sub: VALID_UUID,
      email: 'customer@shop.com',
      type: 'customer',
    }),
  };
}

function createApp(authService: ReturnType<typeof createMockCustomerAuthService>) {
  const app = new Hono();

  // Replicate error handler so structured errors return proper status codes
  app.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' } },
        400,
      );
    }
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as unknown as { statusCode: number }).statusCode;
      return c.json({ error: { message: error.message } }, statusCode as 400);
    }
    return c.json({ error: { message: error.message } }, 500);
  });

  app.route('/auth', createCustomerAuthRoutes(authService as unknown as CustomerAuthService));
  return app;
}

function authHeader(token = 'valid-token') {
  return { Authorization: `Bearer ${token}` };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Customer Auth Routes', () => {
  let authService: ReturnType<typeof createMockCustomerAuthService>;
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    authService = createMockCustomerAuthService();
    app = createApp(authService);
  });

  /* ---- POST /auth/login ----------------------------------------- */

  describe('POST /auth/login', () => {
    it('returns token on valid credentials', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@shop.com', password: 'secure-pw-123' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.token).toBe('jwt-token-456');
      expect(body.data.customer.email).toBe('customer@shop.com');
    });

    it('returns 401 for invalid password', async () => {
      authService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@shop.com', password: 'wrong' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 for nonexistent user', async () => {
      authService.login.mockRejectedValue(new UnauthorizedError('Invalid credentials'));

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@shop.com', password: 'whatever' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 400 for missing email', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'secure-pw-123' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@shop.com' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'secure-pw-123' }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys (.strict())', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'customer@shop.com',
          password: 'secure-pw-123',
          extra: 'nope',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- POST /auth/register -------------------------------------- */

  describe('POST /auth/register', () => {
    const VALID_REGISTER = {
      email: 'new@shop.com',
      password: 'secure-pw-123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('registers a new customer', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REGISTER),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.token).toBeTruthy();
      expect(body.data.customer).toBeDefined();
      expect(authService.register).toHaveBeenCalledWith(VALID_REGISTER);
    });

    it('returns 409 for duplicate email', async () => {
      authService.register.mockRejectedValue(
        new ConflictError('Email already exists', { email: 'customer@shop.com' }),
      );

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_REGISTER),
      });

      expect(res.status).toBe(409);
    });

    it('returns 400 for weak password (too short)', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REGISTER, password: 'short' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing firstName', async () => {
      const { firstName: _, ...body } = VALID_REGISTER;

      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REGISTER, email: 'bad' }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys (.strict())', async () => {
      const res = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_REGISTER, role: 'admin' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- POST /auth/forgot-password ------------------------------- */

  describe('POST /auth/forgot-password', () => {
    it('returns success message for valid email', async () => {
      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@shop.com' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toMatch(/reset/i);
    });

    it('returns 200 even for nonexistent email (no info leak)', async () => {
      authService.forgotPassword.mockResolvedValue(undefined);

      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@shop.com' }),
      });

      expect(res.status).toBe(200);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await app.request('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-email' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- POST /auth/reset-password -------------------------------- */

  describe('POST /auth/reset-password', () => {
    it('resets password with valid token', async () => {
      const res = await app.request('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-reset-token', newPassword: 'new-secure-pw' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toMatch(/reset/i);
    });

    it('returns 400 for invalid/expired token', async () => {
      authService.resetPassword.mockRejectedValue(new UnauthorizedError('Invalid token'));

      const res = await app.request('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expired-token', newPassword: 'new-secure-pw' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for short new password', async () => {
      const res = await app.request('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', newPassword: 'short' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- GET /auth/me --------------------------------------------- */

  describe('GET /auth/me', () => {
    it('returns customer profile when authenticated', async () => {
      const res = await app.request('/auth/me', {
        headers: authHeader(),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.email).toBe('customer@shop.com');
      expect(authService.getProfile).toHaveBeenCalledWith(VALID_UUID);
    });

    it('returns 401 without auth header', async () => {
      const res = await app.request('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      authService.verifyToken.mockImplementation(() => {
        throw new UnauthorizedError('Invalid token');
      });

      const res = await app.request('/auth/me', {
        headers: authHeader('bad-token'),
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed auth header (no Bearer prefix)', async () => {
      const res = await app.request('/auth/me', {
        headers: { Authorization: 'Token abc123' },
      });

      expect(res.status).toBe(401);
    });
  });

  /* ---- POST /auth/logout ---------------------------------------- */

  describe('POST /auth/logout', () => {
    it('logs out authenticated customer', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: authHeader(),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toMatch(/logged out/i);
      expect(authService.logout).toHaveBeenCalledWith(VALID_UUID);
    });

    it('returns 401 without auth header', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
    });
  });

  /* ---- PUT /auth/me --------------------------------------------- */

  describe('PUT /auth/me', () => {
    it('updates customer profile', async () => {
      const res = await app.request('/auth/me', {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.firstName).toBe('Updated');
    });

    it('returns 401 without auth', async () => {
      const res = await app.request('/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });

      expect(res.status).toBe(401);
    });

    it('rejects extra keys (.strict())', async () => {
      const res = await app.request('/auth/me', {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated', role: 'admin' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- PUT /auth/password --------------------------------------- */

  describe('PUT /auth/password', () => {
    it('changes password with valid current password', async () => {
      const res = await app.request('/auth/password', {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'old-pw', newPassword: 'brand-new-pw' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toMatch(/changed/i);
    });

    it('returns 401 without auth', async () => {
      const res = await app.request('/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'old-pw', newPassword: 'brand-new-pw' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 400 for short new password', async () => {
      const res = await app.request('/auth/password', {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: 'old-pw', newPassword: 'short' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
