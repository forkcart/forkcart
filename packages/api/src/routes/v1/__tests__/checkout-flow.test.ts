import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createCartRoutes } from '../carts';
import type { CartService } from '@forkcart/core';
import { NotFoundError, ValidationError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CART_UUID = '550e8400-e29b-41d4-a716-446655440000';
const PRODUCT_UUID = '770e8400-e29b-41d4-a716-446655440000';
const PRODUCT_UUID_2 = '770e8400-e29b-41d4-a716-446655440099';
const ITEM_UUID = '880e8400-e29b-41d4-a716-446655440000';
const ITEM_UUID_2 = '880e8400-e29b-41d4-a716-446655440099';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fakeEmptyCart(id = CART_UUID) {
  return {
    id,
    customerId: null,
    sessionId: 'guest-session',
    items: [],
    subtotal: 0,
    itemCount: 0,
    createdAt: '2026-04-11T12:00:00Z',
    updatedAt: '2026-04-11T12:00:00Z',
  };
}

function fakeCartWithItems(
  items: Array<{ id: string; productId: string; quantity: number; unitPrice: number }> = [],
) {
  const defaultItems =
    items.length > 0
      ? items
      : [{ id: ITEM_UUID, productId: PRODUCT_UUID, quantity: 2, unitPrice: 2499 }];
  const cartItems = defaultItems.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.unitPrice * item.quantity,
    productName: 'ForkCart T-Shirt',
    productSlug: 'forkcart-tshirt',
    productImage: null,
  }));
  const subtotal = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return {
    ...fakeEmptyCart(),
    items: cartItems,
    subtotal,
    itemCount,
  };
}

function createMockCartService(): Record<string, ReturnType<typeof vi.fn>> {
  return {
    create: vi.fn().mockResolvedValue(fakeEmptyCart()),
    getById: vi.fn().mockResolvedValue(fakeEmptyCart()),
    addItem: vi.fn().mockResolvedValue(fakeCartWithItems()),
    updateItem: vi.fn().mockResolvedValue(fakeCartWithItems()),
    removeItem: vi.fn().mockResolvedValue(fakeEmptyCart()),
    clear: vi.fn().mockResolvedValue(fakeEmptyCart()),
    assignToCustomer: vi.fn(),
  };
}

function createApp(cartService: ReturnType<typeof createMockCartService>) {
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' } },
        400,
      );
    }
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as unknown as { statusCode: number }).statusCode;
      const code = (error as unknown as { code: string }).code;
      return c.json({ error: { code, message: error.message } }, statusCode as 400);
    }
    return c.json({ error: { message: error.message } }, 500);
  });

  app.route('/carts', createCartRoutes(cartService as unknown as CartService));
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Checkout Flow (E2E)', () => {
  let cartService: ReturnType<typeof createMockCartService>;
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    cartService = createMockCartService();
    app = createApp(cartService);
  });

  describe('Full Guest Checkout Flow', () => {
    it('create cart → add item → update quantity → verify totals', async () => {
      // Step 1: Create cart
      const createRes = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'guest-session' }),
      });
      expect(createRes.status).toBe(201);
      const cart = (await createRes.json()).data;
      expect(cart.id).toBe(CART_UUID);
      expect(cart.items).toHaveLength(0);

      // Step 2: Add first item
      const addRes = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 2 }),
      });
      expect(addRes.status).toBe(201);
      const withItem = (await addRes.json()).data;
      expect(withItem.items).toHaveLength(1);
      expect(withItem.items[0].quantity).toBe(2);

      // Step 3: Update quantity
      const updatedCart = fakeCartWithItems([
        { id: ITEM_UUID, productId: PRODUCT_UUID, quantity: 5, unitPrice: 2499 },
      ]);
      cartService.updateItem.mockResolvedValue(updatedCart);

      const updateRes = await app.request(`/carts/${CART_UUID}/items/${ITEM_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 5 }),
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()).data;
      expect(updated.items[0].quantity).toBe(5);
      expect(updated.subtotal).toBe(2499 * 5);
    });

    it('create cart → add multiple items → remove one → verify', async () => {
      // Create cart
      const createRes = await app.request('/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(createRes.status).toBe(201);

      // Add item 1
      cartService.addItem.mockResolvedValue(
        fakeCartWithItems([
          { id: ITEM_UUID, productId: PRODUCT_UUID, quantity: 1, unitPrice: 2499 },
        ]),
      );
      const add1 = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1 }),
      });
      expect(add1.status).toBe(201);

      // Add item 2
      cartService.addItem.mockResolvedValue(
        fakeCartWithItems([
          { id: ITEM_UUID, productId: PRODUCT_UUID, quantity: 1, unitPrice: 2499 },
          { id: ITEM_UUID_2, productId: PRODUCT_UUID_2, quantity: 3, unitPrice: 999 },
        ]),
      );
      const add2 = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID_2, quantity: 3 }),
      });
      expect(add2.status).toBe(201);
      const twoItems = (await add2.json()).data;
      expect(twoItems.items).toHaveLength(2);
      expect(twoItems.subtotal).toBe(2499 + 999 * 3);

      // Remove first item
      cartService.removeItem.mockResolvedValue(
        fakeCartWithItems([
          { id: ITEM_UUID_2, productId: PRODUCT_UUID_2, quantity: 3, unitPrice: 999 },
        ]),
      );
      const removeRes = await app.request(`/carts/${CART_UUID}/items/${ITEM_UUID}`, {
        method: 'DELETE',
      });
      expect(removeRes.status).toBe(200);
      const afterRemove = (await removeRes.json()).data;
      expect(afterRemove.items).toHaveLength(1);
      expect(afterRemove.items[0].productId).toBe(PRODUCT_UUID_2);
    });
  });

  describe('Cart Validation Edge Cases', () => {
    it('rejects zero quantity', async () => {
      const res = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 0 }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects negative quantity', async () => {
      const res = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: -5 }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects non-UUID productId', async () => {
      const res = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'not-a-uuid', quantity: 1 }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects non-UUID cart ID in path', async () => {
      const res = await app.request('/carts/bad-uuid');
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent cart', async () => {
      const randomUuid = '990e8400-e29b-41d4-a716-446655440099';
      cartService.getById.mockRejectedValue(new NotFoundError('Cart', randomUuid));
      const res = await app.request(`/carts/${randomUuid}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 when adding to non-existent cart', async () => {
      cartService.addItem.mockRejectedValue(new NotFoundError('Cart', CART_UUID));
      const res = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1 }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 404 when product does not exist', async () => {
      cartService.addItem.mockRejectedValue(new NotFoundError('Product', PRODUCT_UUID));
      const res = await app.request(`/carts/${CART_UUID}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: PRODUCT_UUID, quantity: 1 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Express Checkout (Quick Cart)', () => {
    it('creates quick cart with items and returns checkout URL', async () => {
      cartService.create.mockResolvedValue(fakeEmptyCart());
      cartService.addItem.mockResolvedValue(fakeCartWithItems());
      cartService.getById.mockResolvedValue(fakeCartWithItems());

      const res = await app.request('/carts/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: PRODUCT_UUID, quantity: 2 }],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.checkoutUrl).toContain(CART_UUID);
    });

    it('rejects quick cart with empty items array', async () => {
      const res = await app.request('/carts/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when no items could be added (all products missing)', async () => {
      cartService.create.mockResolvedValue(fakeEmptyCart());
      cartService.addItem.mockRejectedValue(new NotFoundError('Product'));
      cartService.getById.mockResolvedValue(fakeEmptyCart());

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

  describe('Cart Clear', () => {
    it('clears all items from cart', async () => {
      cartService.clear.mockResolvedValue(fakeEmptyCart());
      const res = await app.request(`/carts/${CART_UUID}`, { method: 'DELETE' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.items).toHaveLength(0);
      expect(body.data.subtotal).toBe(0);
    });
  });
});
