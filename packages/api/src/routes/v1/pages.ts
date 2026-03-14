import { Hono } from 'hono';
import type { PageService } from '@forkcart/core';
import {
  CreatePageSchema,
  UpdatePageSchema,
  PageFilterSchema,
  PaginationSchema,
  IdParamSchema,
} from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

/** Page CRUD routes */
export function createPageRoutes(pageService: PageService) {
  const router = new Hono();

  /** List pages with filtering and pagination */
  router.get('/', async (c) => {
    const query = c.req.query();
    const filter = PageFilterSchema.parse(query);
    const pagination = PaginationSchema.parse(query);

    const result = await pageService.list(filter, pagination);
    return c.json(result);
  });

  /** Get page by ID or slug */
  router.get('/:idOrSlug', async (c) => {
    const idOrSlug = c.req.param('idOrSlug');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const page = isUuid
      ? await pageService.getById(idOrSlug)
      : await pageService.getBySlug(idOrSlug);

    return c.json({ data: page });
  });

  /** Create page (admin only) */
  router.post('/', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreatePageSchema.parse(body);

    const page = await pageService.create(input);
    return c.json({ data: page }, 201);
  });

  /** Update page (admin only) */
  router.put('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdatePageSchema.parse(body);

    const page = await pageService.update(id, input);
    return c.json({ data: page });
  });

  /** Publish page (admin only) */
  router.put('/:id/publish', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });

    const page = await pageService.publish(id);
    return c.json({ data: page });
  });

  /** Unpublish page (admin only) */
  router.put('/:id/unpublish', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });

    const page = await pageService.unpublish(id);
    return c.json({ data: page });
  });

  /** Delete page (admin only) */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await pageService.delete(id);
    return c.json({ success: true }, 200);
  });

  return router;
}
