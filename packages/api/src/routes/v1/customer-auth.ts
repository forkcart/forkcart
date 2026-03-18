import { Hono } from 'hono';
import { z } from 'zod';
import type { CustomerAuthService, CartService, OrderRepository } from '@forkcart/core';
import { createCustomerAuthMiddleware } from '../../middleware/customer-auth';

// RVS-025: .strict() prevents prototype pollution via extra keys
const RegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
  })
  .strict();

const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

const UpdateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
  })
  .strict();

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
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

  /** Logout (RVS-019: record token invalidation timestamp) */
  router.post('/logout', requireAuth, async (c) => {
    const customer = c.get('customer');
    await customerAuthService.logout(customer.id);
    return c.json({ data: { message: 'Logged out successfully' } });
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

  /** Reset password with token (RVS-021) */
  router.post('/reset-password', async (c) => {
    const body = await c.req.json();
    const input = ResetPasswordSchema.parse(body);

    try {
      await customerAuthService.resetPassword(input.token, input.newPassword);
      return c.json({ data: { message: 'Password has been reset successfully' } });
    } catch (error) {
      return c.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' } },
        400,
      );
    }
  });

  return router;
}

/** Post-purchase registration — register after guest checkout and link orders */
const PostPurchaseRegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    orderId: z.string().uuid().optional(),
  })
  .strict();

export function createPostPurchaseRegisterRoute(
  customerAuthService: CustomerAuthService,
  orderRepository: OrderRepository,
) {
  const router = new Hono();

  router.post('/guest-register', async (c) => {
    const body = await c.req.json();
    const input = PostPurchaseRegisterSchema.parse(body);

    // Register the customer (will throw ConflictError if email exists)
    const result = await customerAuthService.register(input);

    // Link any guest orders with this email to the new customer
    await orderRepository.linkGuestOrders(input.email, result.customer.id);

    return c.json({ data: result }, 201);
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
