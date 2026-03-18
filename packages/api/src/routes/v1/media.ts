import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { MediaService } from '@forkcart/core';
import { PaginationSchema, IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

/** Media CRUD + upload routes */
export function createMediaRoutes(mediaService: MediaService) {
  const router = new Hono();

  /** Upload a file (multipart) */
  router.post(
    '/upload',
    requireRole('admin', 'superadmin'),
    bodyLimit({ maxSize: 10 * 1024 * 1024 }), // 10MB
    async (c) => {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'No file provided' } }, 400);
      }

      const alt = formData.get('alt') as string | null;
      const entityType = formData.get('entityType') as string | null;
      const entityId = formData.get('entityId') as string | null;
      const sortOrderStr = formData.get('sortOrder') as string | null;

      const result = await mediaService.upload({
        file,
        originalName: file.name,
        alt: alt ?? undefined,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        sortOrder: sortOrderStr ? parseInt(sortOrderStr, 10) : undefined,
      });

      return c.json({ data: result }, 201);
    },
  );

  /** List all media */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const query = c.req.query();
    const pagination = PaginationSchema.parse(query);
    const result = await mediaService.list(pagination);
    return c.json(result);
  });

  /** Get single media by ID */
  router.get('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const result = await mediaService.getById(id);
    return c.json({ data: result });
  });

  /** Delete media (file + DB) */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await mediaService.delete(id);
    return c.json({ success: true });
  });

  /** Reorder media */
  router.put('/reorder', requireRole('admin', 'superadmin'), async (c) => {
    const body = (await c.req.json()) as { items: Array<{ id: string; sortOrder: number }> };
    await mediaService.reorderMedia(body.items);
    return c.json({ success: true });
  });

  return router;
}
