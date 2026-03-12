import { Hono } from 'hono';
import type { ProductService } from '@forkcart/core';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductFilterSchema,
  PaginationSchema,
  IdParamSchema,
} from '@forkcart/shared';

/** Product CRUD routes */
export function createProductRoutes(productService: ProductService) {
  const router = new Hono();

  /** List products with filtering and pagination */
  router.get('/', async (c) => {
    const query = c.req.query();
    const filter = ProductFilterSchema.parse(query);
    const pagination = PaginationSchema.parse(query);

    const result = await productService.list(filter, pagination);
    return c.json(result);
  });

  /** Get product by ID */
  router.get('/:id', async (c) => {
    const id = c.req.param('id');

    // Try UUID first, then slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const product = isUuid ? await productService.getById(id) : await productService.getBySlug(id);

    return c.json({ data: product });
  });

  /** Create product */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateProductSchema.parse(body);

    const product = await productService.create(input);
    return c.json({ data: product }, 201);
  });

  /** Update product */
  router.put('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateProductSchema.parse(body);

    const product = await productService.update(id, input);
    return c.json({ data: product });
  });

  /** Delete product */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await productService.delete(id);
    return c.json({ success: true }, 200);
  });

  return router;
}
