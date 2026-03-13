import { Hono } from 'hono';
import type { CategoryService } from '@forkcart/core';
import { CreateCategorySchema, UpdateCategorySchema, IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

/** Category CRUD routes */
export function createCategoryRoutes(categoryService: CategoryService) {
  const router = new Hono();

  /** List all categories (with optional product counts) */
  router.get('/', async (c) => {
    const activeOnly = c.req.query('active') === 'true';
    const withCounts = c.req.query('withCounts') === 'true';
    const allCategories = await categoryService.listAll(activeOnly);

    if (withCounts) {
      const countsMap = await categoryService.getProductCounts();
      const enriched = allCategories.map((cat) => ({
        ...cat,
        productCount: countsMap.get(cat.id) ?? 0,
      }));
      return c.json({ data: enriched });
    }

    return c.json({ data: allCategories });
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

  /** Delete category (admin + superadmin only) */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await categoryService.delete(id);
    return c.json({ success: true }, 200);
  });

  return router;
}
