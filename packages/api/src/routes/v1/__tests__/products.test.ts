import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createProductRoutes } from '../products';
import type { ProductService, MediaService, ProductTranslationService } from '@forkcart/core';
import { NotFoundError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440000';

function fakeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product',
    shortDescription: null,
    sku: 'TST-001',
    status: 'active',
    price: 2999,
    compareAtPrice: null,
    costPrice: null,
    currency: 'EUR',
    trackInventory: true,
    inventoryQuantity: 100,
    weight: null,
    weightUnit: 'g',
    metadata: null,
    createdAt: '2026-03-19T12:00:00Z',
    updatedAt: '2026-03-19T12:00:00Z',
    ...overrides,
  };
}

function createMockProductService() {
  return {
    list: vi.fn().mockResolvedValue({
      data: [fakeProduct()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    getById: vi.fn().mockResolvedValue(fakeProduct()),
    getBySlug: vi.fn().mockResolvedValue(fakeProduct()),
    create: vi.fn().mockResolvedValue(fakeProduct()),
    update: vi.fn().mockResolvedValue(fakeProduct({ name: 'Updated' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMediaService() {
  return {
    getByEntity: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Create a Hono app with product routes.
 * The `role` param simulates the authenticated user's role (injected via middleware mock).
 * If role is null, no user is set (unauthenticated).
 */
function createApp(
  productService: ReturnType<typeof createMockProductService>,
  opts: { role?: string | null; mediaService?: ReturnType<typeof createMockMediaService> } = {},
) {
  const app = new Hono();

  // Simulate auth middleware — set user in context
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

  app.route(
    '/products',
    createProductRoutes(
      productService as unknown as ProductService,
      (opts.mediaService ?? createMockMediaService()) as unknown as MediaService,
    ),
  );
  return app;
}

const VALID_PRODUCT_INPUT = {
  name: 'New Product',
  slug: 'new-product',
  price: 1999,
  status: 'draft' as const,
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Product Routes', () => {
  let productService: ReturnType<typeof createMockProductService>;

  beforeEach(() => {
    vi.restoreAllMocks();
    productService = createMockProductService();
  });

  /* ---- GET /products -------------------------------------------- */

  describe('GET /products', () => {
    it('returns product list', async () => {
      const app = createApp(productService);
      const res = await app.request('/products');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Test Product');
    });

    it('passes pagination parameters', async () => {
      const app = createApp(productService);
      await app.request('/products?page=2&limit=10');

      expect(productService.list).toHaveBeenCalledWith(
        expect.any(Object) as Record<string, unknown>,
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('passes filter parameters', async () => {
      const app = createApp(productService);
      await app.request('/products?status=active&search=test');

      expect(productService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', search: 'test' }),
        expect.any(Object) as Record<string, unknown>,
      );
    });

    it('uses default pagination values', async () => {
      const app = createApp(productService);
      await app.request('/products');

      expect(productService.list).toHaveBeenCalledWith(
        expect.any(Object) as Record<string, unknown>,
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('returns empty list gracefully', async () => {
      productService.list.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const app = createApp(productService);
      const res = await app.request('/products');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(0);
    });
  });

  /* ---- GET /products/:id ---------------------------------------- */

  describe('GET /products/:id', () => {
    it('returns product by UUID', async () => {
      const app = createApp(productService);
      const res = await app.request(`/products/${VALID_UUID}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(VALID_UUID);
      expect(productService.getById).toHaveBeenCalledWith(VALID_UUID);
    });

    it('resolves product by slug (non-UUID)', async () => {
      const app = createApp(productService);
      const res = await app.request('/products/test-product');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.slug).toBe('test-product');
      expect(productService.getBySlug).toHaveBeenCalledWith('test-product');
    });

    it('returns 404 for non-existent product', async () => {
      productService.getById.mockRejectedValue(new NotFoundError('Product', VALID_UUID));

      const app = createApp(productService);
      const res = await app.request(`/products/${VALID_UUID}`);

      expect(res.status).toBe(404);
    });
  });

  /* ---- POST /products ------------------------------------------- */

  describe('POST /products', () => {
    it('creates product with valid data', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_PRODUCT_INPUT),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data).toBeDefined();
      expect(productService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Product', slug: 'new-product' }),
      );
    });

    it('returns 400 for missing name', async () => {
      const { name: _, ...input } = VALID_PRODUCT_INPUT;
      const app = createApp(productService, { role: 'admin' });

      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid slug format', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_PRODUCT_INPUT, slug: 'INVALID SLUG!!' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for negative price', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...VALID_PRODUCT_INPUT, price: -100 }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing slug', async () => {
      const { slug: _, ...input } = VALID_PRODUCT_INPUT;
      const app = createApp(productService, { role: 'admin' });

      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- PUT /products/:id ---------------------------------------- */

  describe('PUT /products/:id', () => {
    it('updates product with valid data', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe('Updated');
      expect(productService.update).toHaveBeenCalledWith(
        VALID_UUID,
        expect.objectContaining({ name: 'Updated' }),
      );
    });

    it('returns 404 for non-existent product', async () => {
      productService.update.mockRejectedValue(new NotFoundError('Product', VALID_UUID));

      const app = createApp(productService, { role: 'admin' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID param', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request('/products/not-a-uuid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      expect(res.status).toBe(400);
    });
  });

  /* ---- DELETE /products/:id ------------------------------------- */

  describe('DELETE /products/:id', () => {
    it('deletes product (admin)', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      expect(productService.delete).toHaveBeenCalledWith(VALID_UUID);
    });

    it('deletes product (superadmin)', async () => {
      const app = createApp(productService, { role: 'superadmin' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp(productService, { role: 'editor' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(403);
    });

    it('returns 401 for unauthenticated user', async () => {
      const app = createApp(productService, { role: null });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent product', async () => {
      productService.delete.mockRejectedValue(new NotFoundError('Product', VALID_UUID));

      const app = createApp(productService, { role: 'admin' });
      const res = await app.request(`/products/${VALID_UUID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid UUID param', async () => {
      const app = createApp(productService, { role: 'admin' });
      const res = await app.request('/products/not-a-uuid', {
        method: 'DELETE',
      });

      expect(res.status).toBe(400);
    });
  });
});
