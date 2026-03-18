import { Hono } from 'hono';
import { z } from 'zod';
import type { CustomerAuthService, CartService } from '@forkcart/core';
import { createCustomerAuthMiddleware } from '../../middleware/customer-auth';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

/** Customer auth API routes (public — no admin auth) */
export function createCustomerAuthRoutes(customerAuthService: CustomerAuthService) {
  const router = new Hono();
  const requireAuth = createCustomerAuthMiddleware(customerAuthService);

  /** Register a new customer account */
  router.post('/register', async (c) => {
    const body = await c.req.json();
    const input = RegisterSchema.parse(body);

    const result = await customerAuthService.register(input);
    return c.json({ data: result }, 201);
  });

  /** Login with email and password */
  router.post('/login', async (c) => {
    const body = await c.req.json();
    const input = LoginSchema.parse(body);

    const result = await customerAuthService.login(input.email, input.password);
    return c.json({ data: result });
  });

  /** Get current customer profile (auth required) */
  router.get('/me', requireAuth, async (c) => {
    const customer = c.get('customer');
    const profile = await customerAuthService.getProfile(customer.id);
    return c.json({ data: profile });
  });

  /** Update customer profile (auth required) */
  router.put('/me', requireAuth, async (c) => {
    const customer = c.get('customer');
    const body = await c.req.json();
    const input = UpdateProfileSchema.parse(body);

    const profile = await customerAuthService.updateProfile(customer.id, input);
    return c.json({ data: profile });
  });

  /** Change password (auth required) */
  router.put('/password', requireAuth, async (c) => {
    const customer = c.get('customer');
    const body = await c.req.json();
    const input = ChangePasswordSchema.parse(body);

    await customerAuthService.changePassword(customer.id, input.currentPassword, input.newPassword);
    return c.json({ data: { message: 'Password changed successfully' } });
  });

  /** Request password reset (public) */
  router.post('/forgot-password', async (c) => {
    const body = await c.req.json();
    const input = ForgotPasswordSchema.parse(body);

    await customerAuthService.forgotPassword(input.email);

    // Always return success to not reveal if email exists
    return c.json({ data: { message: 'If the email exists, a reset link has been generated' } });
  });

  return router;
}

/** Cart assign route — PATCH /api/v1/carts/:id/assign */
export function createCartAssignRoute(
  cartService: CartService,
  customerAuthService: CustomerAuthService,
) {
  const router = new Hono();
  const requireAuth = createCustomerAuthMiddleware(customerAuthService);

  router.patch('/:id/assign', requireAuth, async (c) => {
    const cartId = c.req.param('id')!; // Always present for this route pattern
    const customer = c.get('customer')!; // Always set by requireAuth middleware

    // RVS-006: Only allow assigning cart to the authenticated customer
    const cart = await cartService.assignToCustomer(cartId, customer.id);
    return c.json({ data: cart });
  });

  return router;
}
