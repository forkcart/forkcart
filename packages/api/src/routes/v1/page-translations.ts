import { Hono } from 'hono';
import { z } from 'zod';
import type { PageTranslationService } from '@forkcart/core';

const PageTranslationInputSchema = z.object({
  title: z.string().max(255).nullable().optional(),
  content: z.unknown().optional(),
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

/** Page translation routes — mounted under /pages/:id/translations */
export function createPageTranslationRoutes(pageTranslationService: PageTranslationService) {
  const router = new Hono();

  /** GET /pages/:id/translations — all translations for a page */
  router.get('/:id/translations', async (c) => {
    const pageId = c.req.param('id');
    const translations = await pageTranslationService.getTranslations(pageId);
    return c.json({ data: translations });
  });

  /** GET /pages/:id/translations/:locale — single translation */
  router.get('/:id/translations/:locale', async (c) => {
    const pageId = c.req.param('id');
    const locale = c.req.param('locale');
    const translation = await pageTranslationService.getTranslation(pageId, locale);
    if (!translation) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Translation not found' } }, 404);
    }
    return c.json({ data: translation });
  });

  /** PUT /pages/:id/translations/:locale — create/update translation */
  router.put('/:id/translations/:locale', async (c) => {
    const pageId = c.req.param('id');
    const locale = c.req.param('locale');
    const body = await c.req.json();
    const input = PageTranslationInputSchema.parse(body);
    const translation = await pageTranslationService.upsert(pageId, locale, input);
    return c.json({ data: translation });
  });

  /** DELETE /pages/:id/translations/:locale — delete translation */
  router.delete('/:id/translations/:locale', async (c) => {
    const pageId = c.req.param('id');
    const locale = c.req.param('locale');
    await pageTranslationService.delete(pageId, locale);
    return c.json({ data: { success: true } });
  });

  return router;
}
