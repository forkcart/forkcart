import { Hono } from 'hono';
import { z } from 'zod';
import type { PluginStoreService } from '@forkcart/core';
import { requireRole } from '../../middleware/permissions';

const ListPluginsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  pricing: z.enum(['free', 'paid', 'freemium']).optional(),
  sort: z.enum(['downloads', 'rating', 'newest', 'name']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const SubmitPluginSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  packageName: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  author: z.string().max(255).optional(),
  authorUrl: z.string().url().optional(),
  version: z.string().min(1).max(50),
  type: z
    .enum(['payment', 'marketplace', 'email', 'shipping', 'analytics', 'seo', 'theme', 'other'])
    .optional(),
  category: z.string().max(100).optional(),
  icon: z.string().url().optional(),
  screenshots: z.array(z.string().url()).optional(),
  readme: z.string().optional(),
  pricing: z.enum(['free', 'paid', 'freemium']).optional(),
  price: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.record(z.string()).optional(),
  repository: z.string().url().optional(),
  license: z.string().max(100).optional(),
  changelog: z.string().optional(),
  minForkcartVersion: z.string().optional(),
});

const PublishVersionSchema = z.object({
  version: z.string().min(1).max(50),
  packageName: z.string().min(1).max(255),
  changelog: z.string().optional(),
  minForkcartVersion: z.string().optional(),
  size: z.number().int().optional(),
});

const AddReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().optional(),
});

const SlugParamSchema = z.object({
  slug: z.string().min(1),
});

/** Plugin Store routes */
export function createPluginStoreRoutes(pluginStoreService: PluginStoreService) {
  const router = new Hono();

  // ─── Public Routes ────────────────────────────────────────────────────────

  /** List plugins with filters */
  router.get('/', async (c) => {
    const query = ListPluginsQuerySchema.parse({
      search: c.req.query('search'),
      category: c.req.query('category'),
      type: c.req.query('type'),
      pricing: c.req.query('pricing'),
      sort: c.req.query('sort'),
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });
    const result = await pluginStoreService.listPlugins(query);
    return c.json(result);
  });

  /** Get featured plugins */
  router.get('/featured', async (c) => {
    const featured = await pluginStoreService.getFeatured();
    return c.json({ data: featured });
  });

  /** Get categories with counts */
  router.get('/categories', async (c) => {
    const categories = await pluginStoreService.getCategories();
    return c.json({ data: categories });
  });

  /** Get installed plugins (admin) */
  router.get('/installed', requireRole('admin', 'superadmin'), async (c) => {
    const installed = await pluginStoreService.getInstalled();
    return c.json({ data: installed });
  });

  /** Check for updates (admin) */
  router.get('/updates', requireRole('admin', 'superadmin'), async (c) => {
    const updates = await pluginStoreService.checkUpdates();
    return c.json({ data: updates });
  });

  /** Submit a new plugin (admin) */
  router.post('/submit', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = SubmitPluginSchema.parse(body);
    const listing = await pluginStoreService.submitPlugin(input);
    return c.json({ data: listing }, 201);
  });

  /** Get plugin details by slug */
  router.get('/:slug', async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const plugin = await pluginStoreService.getPlugin(slug);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }
    return c.json({ data: plugin });
  });

  /** Install a plugin from store (admin) */
  router.post('/:slug/install', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const result = await pluginStoreService.installFromStore(slug);
    return c.json({ data: result }, 201);
  });

  /** Uninstall a plugin (admin) */
  router.delete('/:slug/uninstall', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const result = await pluginStoreService.uninstallFromStore(slug);
    return c.json({ data: result });
  });

  /** Add a review (admin) */
  router.post('/:slug/reviews', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const body = await c.req.json();
    const { rating, title, body: reviewBody } = AddReviewSchema.parse(body);

    // Get listing ID from slug
    const plugin = await pluginStoreService.getPlugin(slug);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    // Get userId from auth context
    const userId = (c.get('user') as { id: string })?.id ?? 'anonymous';
    const review = await pluginStoreService.addReview(
      plugin.id,
      userId,
      rating,
      title ?? null,
      reviewBody ?? null,
    );
    return c.json({ data: review }, 201);
  });

  // ─── Review & Approval (superadmin) ───────────────────────────────────────

  /** Get pending plugins for review */
  router.get('/pending', requireRole('superadmin'), async (c) => {
    const pending = await pluginStoreService.getPendingPlugins();
    return c.json({ data: pending });
  });

  /** Approve a plugin */
  router.post('/:slug/approve', requireRole('superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    try {
      const result = await pluginStoreService.approvePlugin(slug);
      return c.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      return c.json({ error: { code: 'BAD_REQUEST', message } }, 400);
    }
  });

  /** Reject a plugin */
  router.post('/:slug/reject', requireRole('superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const body = await c.req.json().catch(() => ({}));
    const reason = (body as { reason?: string }).reason ?? 'No reason provided';
    try {
      const result = await pluginStoreService.rejectPlugin(slug, reason);
      return c.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      return c.json({ error: { code: 'BAD_REQUEST', message } }, 400);
    }
  });

  /** Publish a new version (admin) */
  router.put('/:slug/versions', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const body = await c.req.json();
    const input = PublishVersionSchema.parse(body);

    // Get listing ID from slug
    const plugin = await pluginStoreService.getPlugin(slug);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    const version = await pluginStoreService.publishVersion(plugin.id, input);
    return c.json({ data: version });
  });

  return router;
}
