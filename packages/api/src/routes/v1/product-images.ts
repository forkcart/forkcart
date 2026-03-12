import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { MediaService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';

/** Product image routes — attach/list/remove images for products */
export function createProductImageRoutes(mediaService: MediaService) {
  const router = new Hono();

  /** Upload and attach image to product */
  router.post(
    '/:id/images',
    bodyLimit({ maxSize: 10 * 1024 * 1024 }),
    async (c) => {
      const { id: productId } = IdParamSchema.parse({ id: c.req.param('id') });
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'No file provided' } }, 400);
      }

      const alt = formData.get('alt') as string | null;
      const sortOrderStr = formData.get('sortOrder') as string | null;

      const result = await mediaService.upload({
        file,
        originalName: file.name,
        alt: alt ?? undefined,
        entityType: 'product',
        entityId: productId,
        sortOrder: sortOrderStr ? parseInt(sortOrderStr, 10) : undefined,
      });

      return c.json({ data: result }, 201);
    },
  );

  /** Get all images for a product */
  router.get('/:id/images', async (c) => {
    const { id: productId } = IdParamSchema.parse({ id: c.req.param('id') });
    const images = await mediaService.getByEntity('product', productId);
    return c.json({ data: images });
  });

  /** Attach existing media to product */
  router.post('/:id/images/:mediaId', async (c) => {
    const { id: productId } = IdParamSchema.parse({ id: c.req.param('id') });
    const { id: mediaId } = IdParamSchema.parse({ id: c.req.param('mediaId') });
    const body = await c.req.json().catch(() => ({})) as { sortOrder?: number };

    const result = await mediaService.attachToEntity(mediaId, 'product', productId, body.sortOrder);
    return c.json({ data: result });
  });

  /** Reorder product images */
  router.put('/:id/images/reorder', async (c) => {
    const body = await c.req.json() as { items: Array<{ id: string; sortOrder: number }> };
    await mediaService.reorderMedia(body.items);
    return c.json({ success: true });
  });

  /** Remove image from product (deletes file + DB) */
  router.delete('/:id/images/:mediaId', async (c) => {
    const { id: mediaId } = IdParamSchema.parse({ id: c.req.param('mediaId') });
    await mediaService.delete(mediaId);
    return c.json({ success: true });
  });

  return router;
}
