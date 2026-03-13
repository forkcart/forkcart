import { Hono } from 'hono';
import { z } from 'zod';
import type { ProductTranslationService } from '@forkcart/core';

const TranslationInputSchema = z.object({
  name: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

/** Product translation routes — mounted under /products/:id/translations */
export function createProductTranslationRoutes(
  productTranslationService: ProductTranslationService,
) {
  const router = new Hono();

  /** GET /products/:id/translations — all translations for a product */
  router.get('/:id/translations', async (c) => {
    const productId = c.req.param('id');
    const translations = await productTranslationService.getTranslations(productId);
    return c.json({ data: translations });
  });

  /** GET /products/:id/translations/:locale — single translation */
  router.get('/:id/translations/:locale', async (c) => {
    const productId = c.req.param('id');
    const locale = c.req.param('locale');
    const translation = await productTranslationService.getTranslation(productId, locale);
    if (!translation) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Translation not found' } }, 404);
    }
    return c.json({ data: translation });
  });

  /** PUT /products/:id/translations/:locale — create/update translation */
  router.put('/:id/translations/:locale', async (c) => {
    const productId = c.req.param('id');
    const locale = c.req.param('locale');
    const body = await c.req.json();
    const input = TranslationInputSchema.parse(body);
    const translation = await productTranslationService.upsert(productId, locale, input);
    return c.json({ data: translation });
  });

  /** DELETE /products/:id/translations/:locale — delete translation */
  router.delete('/:id/translations/:locale', async (c) => {
    const productId = c.req.param('id');
    const locale = c.req.param('locale');
    await productTranslationService.delete(productId, locale);
    return c.json({ data: { success: true } });
  });

  /** POST /products/:id/translations/:locale/auto-translate — AI translation */
  router.post('/:id/translations/:locale/auto-translate', async (c) => {
    const productId = c.req.param('id');
    const locale = c.req.param('locale');
    try {
      const translation = await productTranslationService.autoTranslate(productId, locale);
      return c.json({ data: translation });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      return c.json({ error: { code: 'TRANSLATION_ERROR', message } }, 400);
    }
  });

  return router;
}
