import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createCartRoutes } from '../carts';
import type { CartService } from '@forkcart/core';
import { NotFoundError, ValidationError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const PRODUCT_UUID = '660e8400-e29b-41d4-a716-446655440000';
const ITEM_UUID = '770e8400-e29b-41d4-a716-446655440000';

function fakeCart(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    customerId: null,
    sessionId: 'session-123',
    items: [],
    subtotal: 0,
    itemCount: 0,
    createdAt: '2026-03-19T12:00:00Z',
    updatedAt: '2026-03-19T12:00:00Z',
    ...overrides,
  };
}

function fakeCartWithItems() {
  return fakeCart({
    items: [
      {
        id: ITEM_UUID,
        productId: PRODUCT_UUID,
        variantId: null,
        quantity: 2,
        unitPrice: 1999,
        totalPrice: 3998,
        productName: 'Test Product',
        productSlug: 'test-product',
        productImage: null,
      },
    ],
    subtotal: 3998,
    itemCount: 2,
  });
}

function createMockCartService() {
  return {
    create: vi.fn().mockResolvedValue(fakeCart()),
    getById: vi.fn().mockResolvedValue(fakeCart()),
    addItem: vi.fn().mockResolvedValue(fakeCartWithItems()),
    updateItem: vi.fn().mockResolvedValue(fakeCartWithItems()),
    removeItem: vi.fn().mockResolvedValue(fakeCart()),
    clear: vi.fn().mockResolvedValue(fakeCart()),
    assignToCustomer: vi.fn(),
  };
}

function createApp(cartService: ReturnType<typeof createMockCartService>) {
  const app = new Hono();

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

  app.route('/carts', createCartRoutes(cartService as unknown as CartService));
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Cart Routes', () => {
  let cartService: ReturnType<typeof createMockCartService>;
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    cartService = createMockCartService();
    app = createApp(cartService);
  });

  /* ---- POST /carts ---------------------------------------------- */

  describe('POST /carts', () => {
    it('creates a new cart', async () => {
      const res = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-abc' }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.id).toBe(VALID_UUID);
      expect(cartService.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'session-abc' }),
        undefined,
      );
    });

    it('creates cart with optional customerId', async () => {
      const res = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: VALID_UUID }),
      });

      expect(res.status).toBe(201);
      expect(cartService.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: VALID_UUID }),
        undefined,
      );
    });

    it('creates cart with empty body', async () => {
      const res = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(201);
    });

    it('rejects invalid customerId (not UUID)', async () => {
      const res = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: 'not-a-uuid' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- GET /carts/:id ------------------------------------------- */

  describe('GET /carts/:id', () => {
    it('returns cart by ID', async () => {
      const res = await app.request(`/carts/${VALID_UUID}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(VALID_UUID);
      expect(cartService.getById).toHaveBeenCalledWith(VALID_UUID, undefined);
    });

    it('returns 404 for non-existent cart', async () => {
      cartService.getById.mockRejectedValue(new NotFoundError('Cart', VALID_UUID));

      const res = await app.request(`/carts/${VALID_UUID}`);

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await app.request('/carts/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  /* ---- POST /carts/:id/items ------------------------------------ */

  describe('POST /carts/:id/items', () => {
    it('adds item to cart', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 2 }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.items).toHaveLength(1);
      expect(cartService.addItem).toHaveBeenCalledWith(
        VALID_UUID,
        expect.objectContaining({ productId: PRODUCT_UUID, quantity: 2 }),
        undefined,
      );
    });

    it('adds item with default quantity of 1', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID }),
      });

      expect(res.status).toBe(201);
      expect(cartService.addItem).toHaveBeenCalledWith(
        VALID_UUID,
        expect.objectContaining({ productId: PRODUCT_UUID, quantity: 1 }),
        undefined,
      );
    });

    it('returns 400 for invalid productId (not UUID)', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'not-a-uuid', quantity: 1 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for zero quantity', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 0 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative quantity', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: -1 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when cart not found', async () => {
      cartService.addItem.mockRejectedValue(new NotFoundError('Cart', VALID_UUID));

      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1 }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 404 when product not found', async () => {
      cartService.addItem.mockRejectedValue(new NotFoundError('Product', PRODUCT_UUID));

      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1 }),
      });

      expect(res.status).toBe(404);
    });

    it('supports optional variantId', async () => {
      const variantId = '880e8400-e29b-41d4-a716-446655440000';
      const res = await app.request(`/carts/${VALID_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1, variantId }),
      });

      expect(res.status).toBe(201);
      expect(cartService.addItem).toHaveBeenCalledWith(
        VALID_UUID,
        expect.objectContaining({ variantId }),
        undefined,
      );
    });
  });

  /* ---- PUT /carts/:id/items/:itemId ----------------------------- */

  describe('PUT /carts/:id/items/:itemId', () => {
    it('updates item quantity', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items/${ITEM_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(cartService.updateItem).toHaveBeenCalledWith(
        VALID_UUID,
        ITEM_UUID,
        expect.objectContaining({ quantity: 5 }),
        undefined,
      );
    });

    it('allows quantity of 0 (schema allows min 0)', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items/${ITEM_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 0 }),
      });

      expect(res.status).toBe(200);
    });

    it('returns 400 for invalid cart UUID', async () => {
      const res = await app.request(`/carts/not-a-uuid/items/${ITEM_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid item UUID', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items/not-a-uuid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative quantity', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items/${ITEM_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: -1 }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- DELETE /carts/:id/items/:itemId -------------------------- */

  describe('DELETE /carts/:id/items/:itemId', () => {
    it('removes item from cart', async () => {
      const res = await app.request(`/carts/${VALID_UUID}/items/${ITEM_UUID}`, {
        method: 'DELETE',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(cartService.removeItem).toHaveBeenCalledWith(VALID_UUID, ITEM_UUID, undefined);
    });

    it('returns 400 for invalid cart UUID', async () => {
      const res = await app.request(`/carts/not-a-uuid/items/${ITEM_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when item not found', async () => {
      cartService.removeItem.mockRejectedValue(new NotFoundError('CartItem', ITEM_UUID));

      const res = await app.request(`/carts/${VALID_UUID}/items/${ITEM_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });
  });

  /* ---- POST /carts/quick ---------------------------------------- */

  describe('POST /carts/quick', () => {
    it('creates a quick cart with items', async () => {
      cartService.create.mockResolvedValue(fakeCart());
      cartService.getById.mockResolvedValue(fakeCartWithItems());

      const res = await app.request('/carts/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: PRODUCT_UUID, quantity: 2 }],
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.checkoutUrl).toContain(VALID_UUID);
      expect(cartService.create).toHaveBeenCalled();
      expect(cartService.addItem).toHaveBeenCalled();
    });

    it('returns 400 for empty items array', async () => {
      const res = await app.request('/carts/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when no items could be added', async () => {
      cartService.create.mockResolvedValue(fakeCart());
      cartService.addItem.mockRejectedValue(new NotFoundError('Product'));
      cartService.getById.mockResolvedValue(fakeCart()); // empty items

      const res = await app.request('/carts/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: PRODUCT_UUID, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- DELETE /carts/:id (clear) -------------------------------- */

  describe('DELETE /carts/:id', () => {
    it('clears cart', async () => {
      const res = await app.request(`/carts/${VALID_UUID}`, {
        method: 'DELETE',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBeDefined();
      expect(cartService.clear).toHaveBeenCalledWith(VALID_UUID, undefined);
    });
  });
});
