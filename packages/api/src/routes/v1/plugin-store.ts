import { Hono } from 'hono';
import { z } from 'zod';
import type { PluginStoreService, CommissionService } from '@forkcart/core';
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

const PurchaseSchema = z.object({
  buyerId: z.string().uuid().nullable().optional(),
  price: z.string().min(1),
  paymentExternalId: z.string().min(1),
  paymentProvider: z.string().optional(),
});

const PayoutRequestSchema = z.object({
  amount: z.string().min(1),
});

/** Plugin Store routes */
export function createPluginStoreRoutes(
  pluginStoreService: PluginStoreService,
  commissionService?: CommissionService,
) {
  const router = new Hono();

  // ─── Registry proxy helper ──────────────────────────────────────────────

  const REGISTRY_URL = process.env['PLUGIN_REGISTRY_URL'];

  async function fetchRegistry(path: string, query?: string): Promise<Response | null> {
    if (!REGISTRY_URL) return null;
    try {
      const url = `${REGISTRY_URL}${path}${query ? `?${query}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return res;
    } catch {
      // Registry unavailable, fall through to local DB
    }
    return null;
  }

  // ─── Public Routes ────────────────────────────────────────────────────────

  /** List plugins with filters — proxies to central registry if configured */
  router.get('/', async (c) => {
    // Try central registry first
    const registryRes = await fetchRegistry('/store', c.req.url.split('?')[1] ?? '');
    if (registryRes) {
      const registryData = (await registryRes.json()) as { plugins?: Record<string, unknown>[] };
      const rawPlugins = registryData.plugins ?? [];

      // Enrich each plugin with developer name from the registry detail endpoint
      const plugins = await Promise.all(
        (Array.isArray(rawPlugins) ? rawPlugins : []).map(async (p) => {
          let developerName = 'Community Developer';
          try {
            const detailRes = await fetch(`${REGISTRY_URL}/store/${p.slug}`, {
              signal: AbortSignal.timeout(3000),
            });
            if (detailRes.ok) {
              const detail = (await detailRes.json()) as { developer?: { displayName?: string } };
              developerName = detail.developer?.displayName || developerName;
            }
          } catch {
            // ignore
          }
          return {
            ...p,
            author: p.author || developerName,
            description: p.description || p.shortDescription || '',
          };
        }),
      );
      return c.json({ data: plugins });
    }

    // Fallback to local DB
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

    // Try installing from central registry
    if (REGISTRY_URL) {
      try {
        // 1. Get plugin details + latest version from registry
        const detailRes = await fetch(`${REGISTRY_URL}/store/${slug}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!detailRes.ok) throw new Error('Plugin not found in registry');

        const detail = (await detailRes.json()) as {
          plugin: Record<string, unknown>;
          versions: Array<{ version: string; zipPath?: string }>;
        };
        const latestVersion = detail.versions?.[0];
        if (!latestVersion?.version) throw new Error('No version available');

        // 2. Download the ZIP from registry
        const zipRes = await fetch(
          `${REGISTRY_URL}/store/${slug}/download/${latestVersion.version}`,
          { signal: AbortSignal.timeout(30000) },
        );
        if (!zipRes.ok) throw new Error('ZIP download failed');

        const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

        // 3. Extract ZIP to plugins directory
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(zipBuffer);
        const { resolve } = await import('node:path');
        const { mkdirSync } = await import('node:fs');
        const targetDir = resolve(process.cwd(), '../../packages/plugins', slug);
        mkdirSync(targetDir, { recursive: true });
        zip.extractAllTo(targetDir, true);

        // 4. Register in local plugin system DB via psql
        const plugin = detail.plugin;
        const { execSync } = await import('node:child_process');
        const dbUrl =
          process.env['DATABASE_URL'] || 'postgresql://forkcart:forkcart@localhost:5432/forkcart';
        const escapeSql = (s: string) => s.replace(/'/g, "''");
        const insertSql = `INSERT INTO plugins (id, name, version, description, author, is_active, entry_point, metadata, installed_at, updated_at) VALUES (gen_random_uuid(), '${escapeSql(String(plugin.name))}', '${escapeSql(String(latestVersion.version))}', '${escapeSql(String(plugin.shortDescription || plugin.description || ''))}', '${escapeSql(String(plugin.author || 'Community'))}', true, '${escapeSql(String(plugin.packageName || ''))}', '${escapeSql(JSON.stringify({ source: 'registry', slug: String(plugin.slug) }))}', NOW(), NOW()) ON CONFLICT DO NOTHING;`;
        try {
          execSync(`psql "${dbUrl}" -c "${insertSql.replace(/"/g, '\\"')}"`, { timeout: 5000 });
        } catch {
          console.error('Failed to register plugin in DB via psql');
        }

        return c.json(
          {
            data: {
              name: plugin.name,
              slug: plugin.slug,
              version: latestVersion.version,
              installedTo: targetDir,
              source: 'registry',
            },
          },
          201,
        );
      } catch (err) {
        // Fall through to local DB install
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Registry install failed for ${slug}: ${errMsg}`);
      }
    }

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

  // ─── Commission & Payment Routes ────────────────────────────────────────

  if (commissionService) {
    /** Record a plugin purchase */
    router.post('/:slug/purchase', requireRole('admin', 'superadmin'), async (c) => {
      const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
      const body = await c.req.json();
      const input = PurchaseSchema.parse(body);

      const plugin = await pluginStoreService.getPlugin(slug);
      if (!plugin) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
      }

      const purchase = await commissionService.recordPurchase(
        plugin.id,
        input.buyerId ?? null,
        input.price,
        input.paymentExternalId,
        input.paymentProvider,
      );
      return c.json({ data: purchase }, 201);
    });

    /** Get developer earnings */
    router.get('/developer/earnings', requireRole('admin', 'superadmin'), async (c) => {
      const developerId = c.req.query('developerId');
      if (!developerId) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'developerId required' } }, 400);
      }
      const earnings = await commissionService.getDevEarnings(developerId);
      return c.json({ data: earnings });
    });

    /** Get developer purchase history */
    router.get('/developer/purchases', requireRole('admin', 'superadmin'), async (c) => {
      const developerId = c.req.query('developerId');
      if (!developerId) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'developerId required' } }, 400);
      }
      const purchases = await commissionService.getDevPurchaseHistory(developerId);
      return c.json({ data: purchases });
    });

    /** Request a payout */
    router.post('/developer/payout', requireRole('admin', 'superadmin'), async (c) => {
      const body = await c.req.json();
      const { amount } = PayoutRequestSchema.parse(body);
      const developerId = c.req.query('developerId');
      if (!developerId) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'developerId required' } }, 400);
      }
      const payout = await commissionService.requestPayout(developerId, amount);
      return c.json({ data: payout }, 201);
    });
  }

  return router;
}
