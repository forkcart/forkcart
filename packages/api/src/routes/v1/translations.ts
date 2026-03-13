import { Hono } from 'hono';
import { z } from 'zod';
import type { TranslationService } from '@forkcart/core';

const CreateLanguageSchema = z.object({
  locale: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  name: z.string().min(1).max(100).optional(),
});

const PatchTranslationsSchema = z.record(z.string(), z.string());

/** Translation management routes (admin, behind auth) */
export function createTranslationRoutes(translationService: TranslationService) {
  const router = new Hono();

  /** List all languages with completion % */
  router.get('/', async (c) => {
    const langs = await translationService.listLanguages();
    return c.json({ data: langs });
  });

  /** Get all keys for a locale (admin editor view) */
  router.get('/:locale', async (c) => {
    const locale = c.req.param('locale');
    const keys = await translationService.getTranslationKeys(locale);
    return c.json({ data: { locale, keys } });
  });

  /** Full replace of a locale's DB overrides */
  router.put('/:locale', async (c) => {
    const locale = c.req.param('locale');
    const body = await c.req.json();
    const entries = PatchTranslationsSchema.parse(body);
    await translationService.saveTranslations(locale, entries);
    return c.json({ data: { success: true, count: Object.keys(entries).length } });
  });

  /** Patch specific keys */
  router.patch('/:locale', async (c) => {
    const locale = c.req.param('locale');
    const body = await c.req.json();
    const entries = PatchTranslationsSchema.parse(body);
    await translationService.patchTranslations(locale, entries);
    return c.json({ data: { success: true, count: Object.keys(entries).length } });
  });

  /** Create a new language */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const { locale, name } = CreateLanguageSchema.parse(body);
    const lang = await translationService.createLanguage(locale, name);
    return c.json({ data: lang }, 201);
  });

  /** Delete a language */
  router.delete('/:locale', async (c) => {
    const locale = c.req.param('locale');
    await translationService.deleteLanguage(locale);
    return c.json({ data: { success: true } });
  });

  /** Export locale as nested JSON */
  router.get('/export/:locale', async (c) => {
    const locale = c.req.param('locale');
    const data = await translationService.exportLocale(locale);
    c.header('Content-Disposition', `attachment; filename="${locale}.json"`);
    c.header('Content-Type', 'application/json');
    return c.json(data);
  });

  /** Import nested JSON into a locale */
  router.post('/import/:locale', async (c) => {
    const locale = c.req.param('locale');
    const body = await c.req.json();
    const count = await translationService.importLocale(locale, body);
    return c.json({ data: { success: true, imported: count } });
  });

  /** AI-translate all missing keys for a locale */
  router.post('/:locale/auto-translate', async (c) => {
    const locale = c.req.param('locale');
    try {
      const result = await translationService.autoTranslateMissing(locale);
      return c.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      return c.json({ error: { code: 'TRANSLATION_ERROR', message } }, 400);
    }
  });

  /** AI-translate specific keys for a locale */
  router.post('/:locale/auto-translate-keys', async (c) => {
    const body = await c.req.json();
    const keys: string[] = body.keys ?? [];
    const locale = c.req.param('locale');
    try {
      const result = await translationService.autoTranslateKeys(locale, keys);
      return c.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      return c.json({ error: { code: 'TRANSLATION_ERROR', message } }, 400);
    }
  });

  return router;
}

/** Public translation endpoint (no auth, for storefront to fetch translations) */
export function createPublicTranslationRoutes(translationService: TranslationService) {
  const router = new Hono();

  /** Get merged translations for a locale (JSON defaults + DB overrides) */
  router.get('/:locale', async (c) => {
    const locale = c.req.param('locale');
    const translations = await translationService.getTranslations(locale);
    // Cache for 5 minutes
    c.header('Cache-Control', 'public, max-age=300');
    return c.json({ data: { locale, translations } });
  });

  /** Get list of available locales (public) */
  router.get('/', async (c) => {
    const langs = await translationService.listLanguages();
    const enabled = langs
      .filter((l) => l.enabled)
      .map((l) => ({
        locale: l.locale,
        name: l.name,
        nativeName: l.nativeName,
      }));
    c.header('Cache-Control', 'public, max-age=300');
    return c.json({ data: enabled });
  });

  return router;
}
