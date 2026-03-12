import { Hono } from 'hono';
import type { CategoryService } from '@forkcart/core';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  IdParamSchema,
} from '@forkcart/shared';

/** Category CRUD routes */
export function createCategoryRoutes(categoryService: CategoryService) {
  const router = new Hono();

  /** List all categories */
  router.get('/', async (c) => {
    const activeOnly = c.req.query('active') === 'true';
    const categories = await categoryService.listAll(activeOnly);
    return c.json({ data: categories });
  });

  /** Get category tree (root categories with nested children) */
  router.get('/tree', async (c) => {
    const tree = await categoryService.getTree();
    return c.json({ data: tree });
  });

  /** Get category by ID or slug */
  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const category = isUuid
      ? await categoryService.getById(id)
      : await categoryService.getBySlug(id);

    return c.json({ data: category });
  });

  /** Create category */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateCategorySchema.parse(body);

    const category = await categoryService.create(input);
    return c.json({ data: category }, 201);
  });

  /** Update category */
  router.put('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateCategorySchema.parse(body);

    const category = await categoryService.update(id, input);
    return c.json({ data: category });
  });

  /** Delete category */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await categoryService.delete(id);
    return c.json({ success: true }, 200);
  });

  return router;
}
