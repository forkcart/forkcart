import { Hono } from 'hono';
import type { SeoService } from '@forkcart/core';
import { IdParamSchema, BulkGenerateSchema, UpdateSeoSettingsSchema } from '@forkcart/shared';

/** SEO admin routes */
export function createSeoRoutes(seoService: SeoService) {
  const router = new Hono();

  /** Generate meta tags for a single product */
  router.post('/products/:id/generate', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const meta = await seoService.generateMetaTags(id);
    return c.json({ data: meta });
  });

  /** Generate alt texts for a product's images */
  router.post('/products/:id/alt-texts', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const altTexts = await seoService.generateAltTexts(id);
    return c.json({ data: altTexts });
  });

  /** Bulk generate meta tags for multiple products */
  router.post('/products/bulk-generate', async (c) => {
    const body = await c.req.json();
    const { productIds } = BulkGenerateSchema.parse(body);
    const results = await seoService.bulkGenerateMeta(productIds);
    return c.json({ data: results });
  });

  /** SEO analysis for a product */
  router.get('/products/:id/analysis', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const analysis = await seoService.analyzeProductSeo(id);
    return c.json({ data: analysis });
  });

  /** Schema.org JSON-LD for a product */
  router.get('/products/:id/schema', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const schema = await seoService.generateSchemaOrg(id);
    return c.json({ data: schema });
  });

  /** Open Graph tags for a product */
  router.get('/products/:id/og', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const og = await seoService.generateOpenGraphTags(id);
    return c.json({ data: og });
  });

  /** SEO dashboard overview */
  router.get('/overview', async (c) => {
    const overview = await seoService.getProductSeoOverview();
    return c.json({ data: overview });
  });

  /** Get SEO settings */
  router.get('/settings', async (c) => {
    const settings = await seoService.getSettings();
    return c.json({ data: settings });
  });

  /** Update SEO settings */
  router.put('/settings', async (c) => {
    const body = await c.req.json();
    const input = UpdateSeoSettingsSchema.parse(body);
    const settings = await seoService.updateSettings(input);
    return c.json({ data: settings });
  });

  return router;
}

/** Public SEO routes (sitemap, robots) */
export function createPublicSeoRoutes(seoService: SeoService) {
  const router = new Hono();

  /** Dynamic sitemap.xml */
  router.get('/sitemap.xml', async (c) => {
    const xml = await seoService.generateSitemap();
    c.header('Content-Type', 'application/xml; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.body(xml);
  });

  /** Dynamic robots.txt */
  router.get('/robots.txt', (c) => {
    const txt = seoService.generateRobotsTxt();
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(txt);
  });

  return router;
}
