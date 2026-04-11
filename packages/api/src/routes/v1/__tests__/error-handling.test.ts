import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { createProductRoutes } from '../products';
import type { ProductService, MediaService } from '@forkcart/core';
import { NotFoundError } from '@forkcart/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function fakeProduct() {
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
    update: vi.fn().mockResolvedValue(fakeProduct()),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockMediaService() {
  return { getByEntity: vi.fn().mockResolvedValue([]) };
}

function createApp(productService: ReturnType<typeof createMockProductService>) {
  const app = new Hono();

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user-1', email: 'admin@shop.com', role: 'admin' });
    return next();
  });

  // Error handler (mirrors real error-handler.ts behavior)
  app.onError((error, c) => {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details } },
        400,
      );
    }
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as unknown as { statusCode: number }).statusCode;
      const code = (error as unknown as { code: string }).code;
      return c.json({ error: { code, message: error.message } }, statusCode as 400);
    }
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      500,
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      { error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` } },
      404,
    );
  });

  app.route(
    '/products',
    createProductRoutes(
      productService as unknown as ProductService,
      createMockMediaService() as unknown as MediaService,
    ),
  );
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Error Handling', () => {
  let productService: ReturnType<typeof createMockProductService>;
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    productService = createMockProductService();
    app = createApp(productService);
  });

  describe('404 Routes', () => {
    it('returns structured 404 for unknown API routes', async () => {
      const res = await app.request('/nonexistent/route');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('not found');
    });

    it('returns 404 for non-existent product ID', async () => {
      productService.getById.mockRejectedValue(new NotFoundError('Product', VALID_UUID));
      const res = await app.request(`/products/${VALID_UUID}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Validation Errors', () => {
    it('returns 400 for invalid product data (missing name)', async () => {
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 10 }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for negative price', async () => {
      const res = await app.request('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', price: -10 }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Internal Errors', () => {
    it('returns 500 with generic message for unexpected errors', async () => {
      productService.list.mockRejectedValue(new Error('DB connection lost'));
      const res = await app.request('/products');
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      // Should NOT expose internal error details
      expect(body.error.message).not.toContain('DB connection lost');
    });
  });

  describe('Product List Edge Cases', () => {
    it('returns empty list gracefully', async () => {
      productService.list.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
      const res = await app.request('/products');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(0);
    });

    it('returns product list with default pagination', async () => {
      const res = await app.request('/products');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination).toBeDefined();
    });
  });
});
