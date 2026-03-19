import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createPaymentRoutes } from '../payments';
import type { PaymentService } from '@forkcart/core';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createMockPaymentService() {
  return {
    getActiveProviders: vi.fn().mockResolvedValue([]),
    hasActiveProvider: vi.fn().mockReturnValue(false),
    createPaymentIntent: vi.fn().mockResolvedValue({ id: 'pi-1', status: 'pending' }),
    completeDemoPayment: vi.fn().mockResolvedValue({ orderId: 'order-1' }),
    getById: vi.fn().mockResolvedValue({ id: 'pay-1', status: 'completed' }),
    handleWebhook: vi.fn(),
  };
}

function createApp(paymentService: ReturnType<typeof createMockPaymentService>) {
  const app = new Hono();

  // Replicate error handler so Zod errors return 400
  app.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } }, 400);
    }
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as unknown as { statusCode: number }).statusCode;
      return c.json({ error: { message: error.message } }, statusCode as 400);
    }
    return c.json({ error: { message: error.message } }, 500);
  });

  app.route('/payments', createPaymentRoutes(paymentService as unknown as PaymentService));
  return app;
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_INTENT_BODY = {
  cartId: VALID_UUID,
  providerId: 'stripe',
  customer: {
    email: 'test@example.com',
    firstName: 'Max',
    lastName: 'Mustermann',
  },
  shippingAddress: {
    firstName: 'Max',
    lastName: 'Mustermann',
    addressLine1: 'Musterstr. 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
  },
};

const VALID_DEMO_BODY = {
  cartId: VALID_UUID,
  customerEmail: 'test@example.com',
  shippingAddress: {
    firstName: 'Max',
    lastName: 'Mustermann',
    addressLine1: 'Musterstr. 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
  },
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Payment Routes', () => {
  let paymentService: ReturnType<typeof createMockPaymentService>;
  let app: Hono;

  beforeEach(() => {
    paymentService = createMockPaymentService();
    app = createApp(paymentService);
  });

  /* ---- GET /providers ------------------------------------------- */

  describe('GET /payments/providers', () => {
    it('returns providers list', async () => {
      paymentService.getActiveProviders.mockResolvedValue([{ id: 'stripe', name: 'Stripe' }]);
      paymentService.hasActiveProvider.mockReturnValue(true);

      const res = await app.request('/payments/providers');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.providers).toHaveLength(1);
      expect(body.data.fallbackMode).toBe(false);
    });

    it('returns fallbackMode true when no provider', async () => {
      const res = await app.request('/payments/providers');
      const body = await res.json();

      expect(body.data.fallbackMode).toBe(true);
    });
  });

  /* ---- POST /create-intent -------------------------------------- */

  describe('POST /payments/create-intent', () => {
    it('creates payment intent with valid data', async () => {
      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_INTENT_BODY),
      });

      expect(res.status).toBe(201);
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(VALID_INTENT_BODY);
    });

    it('rejects missing cartId', async () => {
      const { cartId: _, ...body } = VALID_INTENT_BODY;

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects invalid cartId (not UUID)', async () => {
      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_INTENT_BODY, cartId: 'not-a-uuid' }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects invalid email', async () => {
      const body = {
        ...VALID_INTENT_BODY,
        customer: { ...VALID_INTENT_BODY.customer, email: 'not-email' },
      };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects country code with wrong length', async () => {
      const body = {
        ...VALID_INTENT_BODY,
        shippingAddress: { ...VALID_INTENT_BODY.shippingAddress, country: 'DEU' },
      };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys on top-level (.strict())', async () => {
      const body = { ...VALID_INTENT_BODY, hackerField: 'evil' };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys on customer (.strict())', async () => {
      const body = {
        ...VALID_INTENT_BODY,
        customer: { ...VALID_INTENT_BODY.customer, phone: '+49123456' },
      };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys on shippingAddress (.strict())', async () => {
      const body = {
        ...VALID_INTENT_BODY,
        shippingAddress: { ...VALID_INTENT_BODY.shippingAddress, extra: 'nope' },
      };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects empty providerId', async () => {
      const body = { ...VALID_INTENT_BODY, providerId: '' };

      const res = await app.request('/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- POST /demo-complete -------------------------------------- */

  describe('POST /payments/demo-complete', () => {
    beforeEach(() => {
      // Default: not production, demo allowed
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEMO_MODE', 'true');
    });

    it('completes demo payment with valid data', async () => {
      const res = await app.request('/payments/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEMO_BODY),
      });

      expect(res.status).toBe(201);
      expect(paymentService.completeDemoPayment).toHaveBeenCalledWith(VALID_DEMO_BODY);
    });

    it('returns 404 in production without DEMO_MODE', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DEMO_MODE', 'false');

      // Need fresh app because env is read at request time
      const res = await app.request('/payments/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEMO_BODY),
      });

      expect(res.status).toBe(404);
    });

    it('allows demo in production when DEMO_MODE=true', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DEMO_MODE', 'true');

      const res = await app.request('/payments/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_DEMO_BODY),
      });

      expect(res.status).toBe(201);
    });

    it('rejects invalid email', async () => {
      const body = { ...VALID_DEMO_BODY, customerEmail: 'bad' };

      const res = await app.request('/payments/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects extra keys (.strict())', async () => {
      const body = { ...VALID_DEMO_BODY, injection: true };

      const res = await app.request('/payments/demo-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- GET /:id ------------------------------------------------- */

  describe('GET /payments/:id', () => {
    it('returns payment by ID', async () => {
      const res = await app.request(`/payments/${VALID_UUID}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe('pay-1');
    });

    it('rejects invalid UUID', async () => {
      const res = await app.request('/payments/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });
});
