import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createOrderRoutes } from '../orders';
import type { OrderService } from '@forkcart/core';
import { NotFoundError, ValidationError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const PRODUCT_UUID = '660e8400-e29b-41d4-a716-446655440000';
const CUSTOMER_UUID = '770e8400-e29b-41d4-a716-446655440000';

function fakeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    orderNumber: 'ORD-001',
    customerId: CUSTOMER_UUID,
    guestEmail: null,
    status: 'pending',
    subtotal: 3998,
    shippingTotal: 499,
    taxTotal: 760,
    total: 5257,
    currency: 'EUR',
    notes: null,
    metadata: null,
    items: [
      {
        productId: PRODUCT_UUID,
        quantity: 2,
        unitPrice: 1999,
        totalPrice: 3998,
      },
    ],
    createdAt: '2026-03-19T12:00:00Z',
    updatedAt: '2026-03-19T12:00:00Z',
    ...overrides,
  };
}

function createMockOrderService() {
  return {
    list: vi.fn().mockResolvedValue({
      data: [fakeOrder()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getById: vi.fn().mockResolvedValue(fakeOrder()),
    create: vi.fn().mockResolvedValue(fakeOrder()),
    updateStatus: vi.fn().mockResolvedValue(fakeOrder({ status: 'confirmed' })),
    getStats: vi.fn().mockResolvedValue({
      totalOrders: 10,
      totalRevenue: 50000,
      averageOrderValue: 5000,
    }),
  };
}

/**
 * Create a Hono app with order routes.
 * The `role` param simulates the authenticated user's role.
 */
function createApp(
  orderService: ReturnType<typeof createMockOrderService>,
  opts: { role?: string | null } = {},
) {
  const app = new Hono();

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    if (opts.role) {
      c.set('user', { id: 'user-1', email: 'admin@shop.com', role: opts.role });
    }
    return next();
  });

  // Error handler
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

  app.route('/orders', createOrderRoutes(orderService as unknown as OrderService));
  return app;
}

const VALID_ORDER_INPUT = {
  customerId: CUSTOMER_UUID,
  items: [
    {
      productId: PRODUCT_UUID,
      quantity: 2,
      unitPrice: 1999,
      totalPrice: 3998,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Order Routes', () => {
  let orderService: ReturnType<typeof createMockOrderService>;

  beforeEach(() => {
    vi.restoreAllMocks();
    orderService = createMockOrderService();
  });

  /* ---- GET /orders ---------------------------------------------- */

  describe('GET /orders', () => {
    it('returns order list (admin)', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].orderNumber).toBe('ORD-001');
    });

    it('returns order list (superadmin)', async () => {
      const app = createApp(orderService, { role: 'superadmin' });
      const res = await app.request('/orders');

      expect(res.status).toBe(200);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp(orderService, { role: 'editor' });
      const res = await app.request('/orders');

      expect(res.status).toBe(403);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp(orderService, { role: null });
      const res = await app.request('/orders');

      expect(res.status).toBe(401);
    });

    it('passes pagination parameters', async () => {
      const app = createApp(orderService, { role: 'admin' });
      await app.request('/orders?page=3&limit=10');

      expect(orderService.list).toHaveBeenCalledWith(
        expect.any(Object) as Record<string, unknown>,
        expect.objectContaining({ page: 3, limit: 10 }),
      );
    });

    it('passes filter parameters', async () => {
      const app = createApp(orderService, { role: 'admin' });
      await app.request(`/orders?status=pending&customerId=${CUSTOMER_UUID}`);

      expect(orderService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', customerId: CUSTOMER_UUID }),
        expect.any(Object) as Record<string, unknown>,
      );
    });

    it('returns empty list gracefully', async () => {
      orderService.list.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(0);
    });
  });

  /* ---- GET /orders/stats ---------------------------------------- */

  describe('GET /orders/stats', () => {
    it('returns stats (admin)', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders/stats');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.totalOrders).toBe(10);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp(orderService, { role: null });
      const res = await app.request('/orders/stats');

      expect(res.status).toBe(401);
    });

    it('returns 403 for editor', async () => {
      const app = createApp(orderService, { role: 'editor' });
      const res = await app.request('/orders/stats');

      expect(res.status).toBe(403);
    });
  });

  /* ---- GET /orders/:id ------------------------------------------ */

  describe('GET /orders/:id', () => {
    it('returns order by ID (admin)', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(VALID_UUID);
      expect(orderService.getById).toHaveBeenCalledWith(VALID_UUID);
    });

    it('returns 404 for non-existent order', async () => {
      orderService.getById.mockRejectedValue(new NotFoundError('Order', VALID_UUID));

      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}`);

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders/not-a-uuid');

      expect(res.status).toBe(400);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp(orderService, { role: null });
      const res = await app.request(`/orders/${VALID_UUID}`);

      expect(res.status).toBe(401);
    });
  });

  /* ---- POST /orders --------------------------------------------- */

  describe('POST /orders', () => {
    it('creates order (admin)', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_ORDER_INPUT),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data).toBeDefined();
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: CUSTOMER_UUID }),
      );
    });

    it('creates order with guest email', async () => {
      const input = {
        guestEmail: 'guest@shop.com',
        guestFirstName: 'Guest',
        guestLastName: 'User',
        items: VALID_ORDER_INPUT.items,
      };

      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(201);
    });

    it('returns 400 for empty items array', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_ORDER_INPUT, items: [] }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative item quantity', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...VALID_ORDER_INPUT,
          items: [{ ...VALID_ORDER_INPUT.items[0], quantity: 0 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp(orderService, { role: null });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_ORDER_INPUT),
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp(orderService, { role: 'editor' });
      const res = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_ORDER_INPUT),
      });

      expect(res.status).toBe(403);
    });
  });

  /* ---- PUT /orders/:id/status ----------------------------------- */

  describe('PUT /orders/:id/status', () => {
    it('updates status to confirmed', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.status).toBe('confirmed');
      expect(orderService.updateStatus).toHaveBeenCalledWith(VALID_UUID, 'confirmed', undefined);
    });

    it('updates status with note', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processing', note: 'Payment received' }),
      });

      expect(res.status).toBe(200);
      expect(orderService.updateStatus).toHaveBeenCalledWith(
        VALID_UUID,
        'processing',
        'Payment received',
      );
    });

    it('accepts all valid status values', async () => {
      const statuses = [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ];

      for (const status of statuses) {
        const app = createApp(orderService, { role: 'admin' });
        const res = await app.request(`/orders/${VALID_UUID}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        expect(res.status).toBe(200);
      }
    });

    it('returns 400 for invalid status value', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent order', async () => {
      orderService.updateStatus.mockRejectedValue(new NotFoundError('Order', VALID_UUID));

      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request('/orders/not-a-uuid/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp(orderService, { role: null });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp(orderService, { role: 'editor' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      expect(res.status).toBe(403);
    });

    it('propagates service-level validation error for invalid transition', async () => {
      orderService.updateStatus.mockRejectedValue(
        new ValidationError('Invalid status transition from pending to delivered'),
      );

      const app = createApp(orderService, { role: 'admin' });
      const res = await app.request(`/orders/${VALID_UUID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
