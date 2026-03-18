import { Hono } from 'hono';
import type { PaymentService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';

// RVS-025: .strict() prevents prototype pollution via extra keys
const CreatePaymentIntentSchema = z
  .object({
    cartId: z.string().uuid(),
    providerId: z.string().min(1),
    shippingMethodId: z.string().uuid().optional(),
    customer: z
      .object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      })
      .strict(),
    shippingAddress: z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        addressLine1: z.string().min(1),
        city: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().length(2),
      })
      .strict(),
  })
  .strict();

const CompleteDemoPaymentSchema = z.object({
  cartId: z.string().uuid(),
  customerEmail: z.string().email(),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    addressLine1: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().length(2),
  }),
});

/** Payment routes — public (no auth required) */
export function createPaymentRoutes(paymentService: PaymentService) {
  const router = new Hono();

  /** Get available payment providers for checkout */
  router.get('/providers', async (c) => {
    const providers = await paymentService.getActiveProviders();
    const hasProvider = paymentService.hasActiveProvider();
    return c.json({
      data: {
        providers,
        fallbackMode: !hasProvider,
      },
    });
  });

  /** Create a payment intent via a specific provider */
  router.post('/create-intent', async (c) => {
    const body = await c.req.json();
    const input = CreatePaymentIntentSchema.parse(body);
    const result = await paymentService.createPaymentIntent(input);
    return c.json({ data: result }, 201);
  });

  /** Complete a prepayment/demo order (RVS-020: dev only) */
  router.post('/demo-complete', async (c) => {
    if (process.env.NODE_ENV === 'production') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Demo payments are disabled in production' } },
        403,
      );
    }
    const body = await c.req.json();
    const input = CompleteDemoPaymentSchema.parse(body);
    const result = await paymentService.completeDemoPayment(input);
    return c.json({ data: result }, 201);
  });

  /** Get payment by ID */
  router.get('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const payment = await paymentService.getById(id);
    return c.json({ data: payment });
  });

  return router;
}

/**
 * Stripe webhook route — SEPARATE from main payment routes.
 * Needs raw body (no JSON parsing) for signature verification.
 * NOT behind auth middleware.
 */
export function createWebhookRoute(paymentService: PaymentService) {
  const router = new Hono();

  router.post('/:providerId', async (c) => {
    const providerId = c.req.param('providerId');
    const rawBody = await c.req.text();

    // Collect all headers
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });

    try {
      await paymentService.handleWebhook(providerId, rawBody, headers);
      return c.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: { code: 'WEBHOOK_ERROR', message } }, 400);
    }
  });

  return router;
}
