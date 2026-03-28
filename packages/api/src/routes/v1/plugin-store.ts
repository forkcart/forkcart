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

/** Plugin Store routes — browsing, local install, reviews, versions */
export function createPluginStoreRoutes(
  pluginStoreService: PluginStoreService,
  pluginLoader?: {
    registerSdkPlugin: (def: never) => void;
    activateSdkPlugin: (
      name: string,
      def: never,
      settings: Record<string, unknown>,
    ) => Promise<void>;
  },
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

    // Try central registry first
    const registryDetail = await fetchRegistry(`/store/${slug}`);
    if (registryDetail) {
      const data = (await registryDetail.json()) as Record<string, unknown>;
      const plugin = data.plugin || data;
      const pricing = String((plugin as Record<string, unknown>).pricing || 'free');
      return c.json({ data: { ...plugin, requiresPurchase: pricing !== 'free' } });
    }

    // Fallback to local DB
    const plugin = await pluginStoreService.getPlugin(slug);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    const requiresPurchase = plugin.pricing !== 'free';

    return c.json({ data: { ...plugin, requiresPurchase } });
  });

  /** Install a plugin from store (admin) — free install, no license checking */
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
        const targetDir = resolve(process.cwd(), 'data', 'plugins', slug);
        mkdirSync(targetDir, { recursive: true });
        zip.extractAllTo(targetDir, true);

        // 3b. Auto-compile TypeScript → JavaScript
        const { existsSync, writeFileSync } = await import('node:fs');
        const { execSync: execSyncFn } = await import('node:child_process');
        // Find the actual plugin dir — ZIP may nest as forkcart-plugin-slug/, slug/, or direct
        const prefixedSubDir = resolve(targetDir, `forkcart-plugin-${slug}`);
        const sameNameSubDir = resolve(targetDir, slug);
        const pluginDir = existsSync(prefixedSubDir)
          ? prefixedSubDir
          : existsSync(sameNameSubDir)
            ? sameNameSubDir
            : targetDir;
        const srcEntry = resolve(pluginDir, 'src', 'index.ts');

        if (existsSync(srcEntry)) {
          try {
            const shimDir = resolve(pluginDir, 'node_modules', '@forkcart', 'plugin-sdk');
            mkdirSync(shimDir, { recursive: true });
            writeFileSync(
              resolve(shimDir, 'index.js'),
              'export function definePlugin(d) { return d; } export function ref() { return "UUID"; } export const coreSchema = {};',
            );
            writeFileSync(
              resolve(shimDir, 'package.json'),
              '{"name":"@forkcart/plugin-sdk","main":"index.js","type":"module"}',
            );

            const distDir = resolve(pluginDir, 'dist');
            mkdirSync(distDir, { recursive: true });

            execSyncFn(
              `npx esbuild "${srcEntry}" --outfile="${resolve(distDir, 'index.js')}" --format=esm --platform=node --bundle --external:hono --loader:.ts=ts`,
              { cwd: pluginDir, timeout: 15000 },
            );
          } catch (buildErr) {
            console.error('Plugin auto-compile failed:', buildErr);
          }
        }

        // 4. Register in local plugin system DB via psql
        const plugin = detail.plugin;
        const { execSync } = await import('node:child_process');
        const dbUrl =
          process.env['DATABASE_URL'] || 'postgresql://forkcart:forkcart@localhost:5432/forkcart';
        const escapeSql = (s: string) => s.replace(/'/g, "''");
        // Use slug as DB name (matches definePlugin technical name), store display name in metadata
        const dbName = String(plugin.slug || plugin.name);
        const insertSql = `INSERT INTO plugins (id, name, version, description, author, is_active, entry_point, metadata, installed_at, updated_at) VALUES (gen_random_uuid(), '${escapeSql(dbName)}', '${escapeSql(String(latestVersion.version))}', '${escapeSql(String(plugin.shortDescription || plugin.description || ''))}', '${escapeSql(String(plugin.author || 'Community'))}', true, '${escapeSql(String(plugin.packageName || ''))}', '${escapeSql(JSON.stringify({ source: 'registry', slug: String(plugin.slug), displayName: String(plugin.name), installedTo: targetDir }))}', NOW(), NOW()) ON CONFLICT DO NOTHING;`;
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

  /** Update an installed plugin to latest version (admin) */
  router.post('/:slug/update', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });

    if (!REGISTRY_URL) {
      return c.json({ error: 'No plugin registry configured' }, 400);
    }

    try {
      // 1. Get latest version from registry
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

      // 2. Download the ZIP
      const zipRes = await fetch(
        `${REGISTRY_URL}/store/${slug}/download/${latestVersion.version}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!zipRes.ok) throw new Error('ZIP download failed');

      const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

      // 3. Extract ZIP — overwrite existing plugin directory
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(zipBuffer);
      const { resolve } = await import('node:path');
      const { mkdirSync, existsSync, writeFileSync } = await import('node:fs');
      const targetDir = resolve(process.cwd(), 'data', 'plugins', slug);
      mkdirSync(targetDir, { recursive: true });
      zip.extractAllTo(targetDir, true);

      // 4. Auto-compile TypeScript → JavaScript (plugins ship as source)
      const prefixedSubDir = resolve(targetDir, `forkcart-plugin-${slug}`);
      const sameNameSubDir = resolve(targetDir, slug);
      const pluginDir = existsSync(prefixedSubDir)
        ? prefixedSubDir
        : existsSync(sameNameSubDir)
          ? sameNameSubDir
          : targetDir;
      const srcEntry = resolve(pluginDir, 'src', 'index.ts');

      if (existsSync(srcEntry)) {
        try {
          // Create a definePlugin shim so esbuild can bundle without @forkcart/plugin-sdk
          const shimDir = resolve(pluginDir, 'node_modules', '@forkcart', 'plugin-sdk');
          mkdirSync(shimDir, { recursive: true });
          writeFileSync(
            resolve(shimDir, 'index.js'),
            'export function definePlugin(d) { return d; } export function ref() { return "UUID"; } export const coreSchema = {};',
          );
          writeFileSync(
            resolve(shimDir, 'package.json'),
            '{"name":"@forkcart/plugin-sdk","main":"index.js","type":"module"}',
          );

          const distDir = resolve(pluginDir, 'dist');
          mkdirSync(distDir, { recursive: true });

          const { execSync } = await import('node:child_process');
          execSync(
            `npx esbuild "${srcEntry}" --outfile="${resolve(distDir, 'index.js')}" --format=esm --platform=node --bundle --external:hono --loader:.ts=ts`,
            { cwd: pluginDir, timeout: 15000 },
          );
        } catch (buildErr) {
          console.error('Plugin auto-compile failed:', buildErr);
          // Continue anyway — maybe dist already exists
        }
      }

      // 5. Update DB version
      const dbUrl =
        process.env['DATABASE_URL'] || 'postgresql://forkcart:forkcart@localhost:5432/forkcart';
      const escapeSql = (s: string) => s.replace(/'/g, "''");
      const plugin = detail.plugin;
      const pluginName = String(plugin.name || slug);
      const updateSql = `UPDATE plugins SET version = '${escapeSql(latestVersion.version)}', updated_at = NOW() WHERE metadata->>'slug' = '${escapeSql(slug)}' OR name = '${escapeSql(pluginName)}';`;
      try {
        const { execSync } = await import('node:child_process');
        execSync(`psql "${dbUrl}" -c "${updateSql.replace(/"/g, '\\"')}"`, { timeout: 5000 });
      } catch {
        console.error('Failed to update plugin version in DB');
      }

      // 6. Hot-reload: re-import the updated plugin module
      try {
        const distPath = resolve(pluginDir, 'dist', 'index.js');
        const cacheBustUrl = `file://${distPath}?t=${Date.now()}`;
        const mod = (await import(cacheBustUrl)) as Record<string, unknown>;
        const def = (mod['default'] ?? mod) as Record<string, unknown>;

        if (def.name && def.version && pluginLoader) {
          pluginLoader.registerSdkPlugin(def as never);
          const settings: Record<string, unknown> = {};
          await pluginLoader.activateSdkPlugin(String(def.name), def as never, settings);
        }
      } catch (reloadErr) {
        console.error('Hot-reload failed (restart API manually):', reloadErr);
      }

      return c.json({
        data: {
          name: plugin.name,
          slug,
          version: latestVersion.version,
          updatedTo: pluginDir,
          source: 'registry',
          message: 'Plugin updated and reloaded!',
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: `Update failed: ${errMsg}` }, 500);
    }
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

  return router;
}
