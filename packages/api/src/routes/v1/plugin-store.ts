import { Hono } from 'hono';
import { z } from 'zod';
import type { PluginStoreService } from '@forkcart/core';
import {
  createPluginBackup,
  restorePluginBackup,
  listPluginBackups,
  cleanupOldBackups,
  getPluginVersion,
} from '@forkcart/core';
import { requireRole } from '../../middleware/permissions';
import { setRebuildNeeded } from './system';

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

  const REGISTRY_URL = process.env['PLUGIN_REGISTRY_URL'] ?? 'https://forkcart.com/api';

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

        // Auto-compile storefront components (React/TSX → ESM browser bundle)
        // Components may live at <pluginDir>/components/ or <pluginDir>/src/components/
        const componentsDirRoot = resolve(pluginDir, 'components');
        const componentsDirSrc = resolve(pluginDir, 'src', 'components');
        const componentsDir = existsSync(componentsDirRoot)
          ? componentsDirRoot
          : existsSync(componentsDirSrc)
            ? componentsDirSrc
            : null;
        if (componentsDir) {
          try {
            const { readdirSync } = await import('node:fs');
            const componentFiles = readdirSync(componentsDir).filter((f) =>
              /\.(tsx?|jsx?)$/.test(f),
            );
            if (componentFiles.length > 0) {
              const barrelLines = componentFiles.map((f) => {
                const basename = f.replace(/\.[^.]+$/, '');
                return `export * from './${basename}';`;
              });
              const barrelPath = resolve(componentsDir, '_barrel.ts');
              writeFileSync(barrelPath, barrelLines.join('\n'));

              const distDir = resolve(pluginDir, 'dist');
              mkdirSync(distDir, { recursive: true });
              const componentsOutFile = resolve(distDir, 'components.js');

              // Create React shims that reference the host app's React (via window globals)
              const reactShimDir = resolve(pluginDir, 'node_modules', 'react');
              const reactDomShimDir = resolve(pluginDir, 'node_modules', 'react-dom');
              const jsxShimDir = resolve(pluginDir, 'node_modules', 'react', 'jsx-runtime');
              mkdirSync(reactShimDir, { recursive: true });
              mkdirSync(reactDomShimDir, { recursive: true });
              mkdirSync(jsxShimDir, { recursive: true });
              writeFileSync(
                resolve(reactShimDir, 'index.js'),
                'const R=globalThis.__FORKCART_REACT;export default R;export const useState=R.useState,useEffect=R.useEffect,useRef=R.useRef,useCallback=R.useCallback,useMemo=R.useMemo,useContext=R.useContext,useReducer=R.useReducer,createContext=R.createContext,forwardRef=R.forwardRef,memo=R.memo,Fragment=R.Fragment,createElement=R.createElement,cloneElement=R.cloneElement,Children=R.Children,Suspense=R.Suspense,lazy=R.lazy;',
              );
              writeFileSync(
                resolve(reactShimDir, 'package.json'),
                '{"name":"react","main":"index.js","type":"module"}',
              );
              writeFileSync(
                resolve(jsxShimDir, 'index.js'),
                'const J=globalThis.__FORKCART_REACT_JSX;export const jsx=J.jsx,jsxs=J.jsxs,Fragment=J.Fragment,jsxDEV=J.jsxDEV||J.jsx;',
              );
              writeFileSync(
                resolve(jsxShimDir, 'package.json'),
                '{"name":"react/jsx-runtime","main":"index.js","type":"module"}',
              );
              writeFileSync(
                resolve(reactDomShimDir, 'index.js'),
                'const RD=globalThis.__FORKCART_REACT_DOM;export default RD;export const createPortal=RD.createPortal,flushSync=RD.flushSync;',
              );
              writeFileSync(
                resolve(reactDomShimDir, 'package.json'),
                '{"name":"react-dom","main":"index.js","type":"module"}',
              );

              execSyncFn(
                `npx esbuild "${barrelPath}" --outfile="${componentsOutFile}" --format=esm --platform=browser --bundle --loader:.ts=ts --loader:.tsx=tsx`,
                { cwd: pluginDir, timeout: 15000 },
              );

              try {
                require('node:fs').unlinkSync(barrelPath);
              } catch {}
            }
          } catch (compErr) {
            console.error('Plugin component auto-compile failed:', compErr);
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

        setRebuildNeeded(`Plugin installed: ${String(plugin.slug || plugin.name)}`);

        return c.json(
          {
            data: {
              name: plugin.name,
              slug: plugin.slug,
              version: latestVersion.version,
              installedTo: targetDir,
              source: 'registry',
              rebuildNeeded: true,
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
    setRebuildNeeded(`Plugin installed: ${slug}`);
    return c.json({ data: { ...result, rebuildNeeded: true } }, 201);
  });

  /**
   * Update an installed plugin to latest version (admin)
   *
   * Creates a backup of the current version before updating.
   * If activation fails, automatically rolls back to the backup.
   */
  router.post('/:slug/update', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });

    if (!REGISTRY_URL) {
      return c.json({ error: 'No plugin registry configured' }, 400);
    }

    const { resolve } = await import('node:path');
    const { mkdirSync, existsSync, writeFileSync } = await import('node:fs');

    // Determine plugin directory paths
    const targetDir = resolve(process.cwd(), 'data', 'plugins', slug);
    const prefixedSubDir = resolve(targetDir, `forkcart-plugin-${slug}`);
    const sameNameSubDir = resolve(targetDir, slug);
    const pluginDir = existsSync(prefixedSubDir)
      ? prefixedSubDir
      : existsSync(sameNameSubDir)
        ? sameNameSubDir
        : targetDir;

    // Track if we rolled back
    let rolledBack = false;
    let backupVersion: string | null = null;

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

      // 2. Create backup of current version BEFORE updating (optional safety net)
      const currentVersion = await getPluginVersion(pluginDir);
      if (currentVersion && existsSync(pluginDir)) {
        const backupResult = await createPluginBackup(slug, currentVersion, pluginDir);
        if (backupResult.success) {
          backupVersion = currentVersion;
          console.log(`[plugin-store] Backup created for ${slug}@${currentVersion}`);
        } else {
          // Log but don't block — backup is optional safety net
          console.warn(`[plugin-store] Backup failed for ${slug}: ${backupResult.error}`);
        }
      }

      // 3. Download the ZIP
      const zipRes = await fetch(
        `${REGISTRY_URL}/store/${slug}/download/${latestVersion.version}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!zipRes.ok) throw new Error('ZIP download failed');

      const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

      // 4. Extract ZIP — overwrite existing plugin directory
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(zipBuffer);
      mkdirSync(targetDir, { recursive: true });
      zip.extractAllTo(targetDir, true);

      // Re-determine plugin directory after extraction (structure may have changed)
      const newPluginDir = existsSync(prefixedSubDir)
        ? prefixedSubDir
        : existsSync(sameNameSubDir)
          ? sameNameSubDir
          : targetDir;

      // 5. Auto-compile TypeScript → JavaScript (plugins ship as source)
      const srcEntry = resolve(newPluginDir, 'src', 'index.ts');

      if (existsSync(srcEntry)) {
        try {
          // Create a definePlugin shim so esbuild can bundle without @forkcart/plugin-sdk
          const shimDir = resolve(newPluginDir, 'node_modules', '@forkcart', 'plugin-sdk');
          mkdirSync(shimDir, { recursive: true });
          writeFileSync(
            resolve(shimDir, 'index.js'),
            'export function definePlugin(d) { return d; } export function ref() { return "UUID"; } export const coreSchema = {};',
          );
          writeFileSync(
            resolve(shimDir, 'package.json'),
            '{"name":"@forkcart/plugin-sdk","main":"index.js","type":"module"}',
          );

          const distDir = resolve(newPluginDir, 'dist');
          mkdirSync(distDir, { recursive: true });

          const { execSync } = await import('node:child_process');
          execSync(
            `npx esbuild "${srcEntry}" --outfile="${resolve(distDir, 'index.js')}" --format=esm --platform=node --bundle --external:hono --loader:.ts=ts`,
            { cwd: newPluginDir, timeout: 15000 },
          );
        } catch (buildErr) {
          console.error('Plugin auto-compile failed:', buildErr);
          // Continue anyway — maybe dist already exists
        }
      }

      // Auto-compile storefront components (React/TSX → ESM browser bundle)
      const componentsDirRoot = resolve(newPluginDir, 'components');
      const componentsDirSrc = resolve(newPluginDir, 'src', 'components');
      const componentsDir = existsSync(componentsDirRoot)
        ? componentsDirRoot
        : existsSync(componentsDirSrc)
          ? componentsDirSrc
          : null;
      if (componentsDir) {
        try {
          const { readdirSync } = await import('node:fs');
          const componentFiles = readdirSync(componentsDir).filter((f) => /\.(tsx?|jsx?)$/.test(f));
          if (componentFiles.length > 0) {
            const barrelLines = componentFiles.map((f) => {
              const basename = f.replace(/\.[^.]+$/, '');
              return `export * from './${basename}';`;
            });
            const barrelPath = resolve(componentsDir, '_barrel.ts');
            writeFileSync(barrelPath, barrelLines.join('\n'));

            const distDir = resolve(newPluginDir, 'dist');
            mkdirSync(distDir, { recursive: true });
            const componentsOutFile = resolve(distDir, 'components.js');

            // Create React shims for shared React instance
            const reactShimDir = resolve(newPluginDir, 'node_modules', 'react');
            const reactDomShimDir = resolve(newPluginDir, 'node_modules', 'react-dom');
            const jsxShimDir = resolve(newPluginDir, 'node_modules', 'react', 'jsx-runtime');
            mkdirSync(reactShimDir, { recursive: true });
            mkdirSync(reactDomShimDir, { recursive: true });
            mkdirSync(jsxShimDir, { recursive: true });
            writeFileSync(
              resolve(reactShimDir, 'index.js'),
              'const R=globalThis.__FORKCART_REACT;export default R;export const useState=R.useState,useEffect=R.useEffect,useRef=R.useRef,useCallback=R.useCallback,useMemo=R.useMemo,useContext=R.useContext,useReducer=R.useReducer,createContext=R.createContext,forwardRef=R.forwardRef,memo=R.memo,Fragment=R.Fragment,createElement=R.createElement,cloneElement=R.cloneElement,Children=R.Children,Suspense=R.Suspense,lazy=R.lazy;',
            );
            writeFileSync(
              resolve(reactShimDir, 'package.json'),
              '{"name":"react","main":"index.js","type":"module"}',
            );
            writeFileSync(
              resolve(jsxShimDir, 'index.js'),
              'const J=globalThis.__FORKCART_REACT_JSX;export const jsx=J.jsx,jsxs=J.jsxs,Fragment=J.Fragment,jsxDEV=J.jsxDEV||J.jsx;',
            );
            writeFileSync(
              resolve(jsxShimDir, 'package.json'),
              '{"name":"react/jsx-runtime","main":"index.js","type":"module"}',
            );
            writeFileSync(
              resolve(reactDomShimDir, 'index.js'),
              'const RD=globalThis.__FORKCART_REACT_DOM;export default RD;export const createPortal=RD.createPortal,flushSync=RD.flushSync;',
            );
            writeFileSync(
              resolve(reactDomShimDir, 'package.json'),
              '{"name":"react-dom","main":"index.js","type":"module"}',
            );

            const { execSync: execSyncComp } = await import('node:child_process');
            execSyncComp(
              `npx esbuild "${barrelPath}" --outfile="${componentsOutFile}" --format=esm --platform=browser --bundle --loader:.ts=ts --loader:.tsx=tsx`,
              { cwd: newPluginDir, timeout: 15000 },
            );

            try {
              require('node:fs').unlinkSync(barrelPath);
            } catch {}
          }
        } catch (compErr) {
          console.error('Plugin component auto-compile failed:', compErr);
        }
      }

      // 6. Hot-reload: re-import the updated plugin module and try to activate
      let activationFailed = false;
      let activationError = '';

      try {
        const distPath = resolve(newPluginDir, 'dist', 'index.js');
        const cacheBustUrl = `file://${distPath}?t=${Date.now()}`;
        const mod = (await import(cacheBustUrl)) as Record<string, unknown>;
        const def = (mod['default'] ?? mod) as Record<string, unknown>;

        if (def.name && def.version && pluginLoader) {
          pluginLoader.registerSdkPlugin(def as never);
          const settings: Record<string, unknown> = {};
          await pluginLoader.activateSdkPlugin(String(def.name), def as never, settings);
        }
      } catch (reloadErr) {
        activationFailed = true;
        activationError =
          reloadErr instanceof Error ? reloadErr.message : 'Unknown activation error';
        console.error('Plugin activation failed:', reloadErr);
      }

      // 7. Auto-rollback if activation failed and we have a backup
      if (activationFailed && backupVersion) {
        console.log(`[plugin-store] Activation failed, rolling back ${slug} to ${backupVersion}`);
        const restoreResult = await restorePluginBackup(slug, backupVersion, pluginDir);
        if (restoreResult.success) {
          rolledBack = true;
          console.log(`[plugin-store] Rollback successful for ${slug}`);

          // Try to re-activate the old version
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
          } catch (rollbackActivationErr) {
            console.error('Rollback activation also failed:', rollbackActivationErr);
          }

          return c.json(
            {
              error: `Update failed, rolled back to ${backupVersion}: ${activationError}`,
              data: {
                slug,
                rolledBack: true,
                restoredVersion: backupVersion,
                failedVersion: latestVersion.version,
              },
            },
            500,
          );
        } else {
          console.error(`[plugin-store] Rollback failed for ${slug}: ${restoreResult.error}`);
        }
      }

      // 8. Update DB version (only if not rolled back)
      if (!rolledBack) {
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

        // 9. Cleanup old backups (keep last 3)
        await cleanupOldBackups(slug, 3);
      }

      setRebuildNeeded(`Plugin updated: ${slug} → ${latestVersion.version}`);

      return c.json({
        data: {
          name: detail.plugin.name,
          slug,
          version: latestVersion.version,
          previousVersion: backupVersion,
          updatedTo: newPluginDir,
          source: 'registry',
          message: 'Plugin updated and reloaded!',
          rebuildNeeded: true,
          rolledBack: false,
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: `Update failed: ${errMsg}`, data: { rolledBack } }, 500);
    }
  });

  /**
   * Rollback a plugin to a previous backup version (admin)
   *
   * @param version - Optional query param to specify which version to rollback to.
   *                  If not provided, rolls back to the most recent backup.
   */
  router.post('/:slug/rollback', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const targetVersion = c.req.query('version') ?? undefined;

    const { resolve } = await import('node:path');
    const { existsSync } = await import('node:fs');

    // Determine plugin directory
    const targetDir = resolve(process.cwd(), 'data', 'plugins', slug);
    const prefixedSubDir = resolve(targetDir, `forkcart-plugin-${slug}`);
    const sameNameSubDir = resolve(targetDir, slug);
    const pluginDir = existsSync(prefixedSubDir)
      ? prefixedSubDir
      : existsSync(sameNameSubDir)
        ? sameNameSubDir
        : targetDir;

    try {
      // Get available backups
      const backups = await listPluginBackups(slug);
      if (backups.length === 0) {
        return c.json(
          { error: { code: 'NO_BACKUPS', message: 'No backups available for this plugin' } },
          404,
        );
      }

      // Restore from backup
      const restoreResult = await restorePluginBackup(slug, targetVersion, pluginDir);
      if (!restoreResult.success) {
        return c.json({ error: { code: 'ROLLBACK_FAILED', message: restoreResult.error } }, 500);
      }

      // Try to re-activate the restored version
      let activationSucceeded = false;
      try {
        const distPath = resolve(pluginDir, 'dist', 'index.js');
        if (existsSync(distPath)) {
          const cacheBustUrl = `file://${distPath}?t=${Date.now()}`;
          const mod = (await import(cacheBustUrl)) as Record<string, unknown>;
          const def = (mod['default'] ?? mod) as Record<string, unknown>;

          if (def.name && def.version && pluginLoader) {
            pluginLoader.registerSdkPlugin(def as never);
            const settings: Record<string, unknown> = {};
            await pluginLoader.activateSdkPlugin(String(def.name), def as never, settings);
            activationSucceeded = true;
          }
        }
      } catch (activationErr) {
        console.error('Rollback activation failed:', activationErr);
      }

      // Update DB version
      if (restoreResult.restoredVersion) {
        const dbUrl =
          process.env['DATABASE_URL'] || 'postgresql://forkcart:forkcart@localhost:5432/forkcart';
        const escapeSql = (s: string) => s.replace(/'/g, "''");
        const updateSql = `UPDATE plugins SET version = '${escapeSql(restoreResult.restoredVersion)}', updated_at = NOW() WHERE metadata->>'slug' = '${escapeSql(slug)}';`;
        try {
          const { execSync } = await import('node:child_process');
          execSync(`psql "${dbUrl}" -c "${updateSql.replace(/"/g, '\\"')}"`, { timeout: 5000 });
        } catch {
          console.error('Failed to update plugin version in DB after rollback');
        }
      }

      setRebuildNeeded(`Plugin rolled back: ${slug} → ${restoreResult.restoredVersion}`);

      return c.json({
        data: {
          slug,
          restoredVersion: restoreResult.restoredVersion,
          activated: activationSucceeded,
          message: activationSucceeded
            ? 'Plugin rolled back and reactivated!'
            : 'Plugin rolled back (restart API to activate)',
          rebuildNeeded: true,
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: `Rollback failed: ${errMsg}` }, 500);
    }
  });

  /**
   * List available backups for a plugin (admin)
   */
  router.get('/:slug/backups', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });

    try {
      const backups = await listPluginBackups(slug);
      return c.json({
        data: backups.map((b) => ({
          version: b.version,
          createdAt: b.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: `Failed to list backups: ${errMsg}` }, 500);
    }
  });

  /** Uninstall a plugin (admin) */
  router.delete('/:slug/uninstall', requireRole('admin', 'superadmin'), async (c) => {
    const { slug } = SlugParamSchema.parse({ slug: c.req.param('slug') });
    const result = await pluginStoreService.uninstallFromStore(slug);
    setRebuildNeeded(`Plugin uninstalled: ${slug}`);
    return c.json({ data: { ...result, rebuildNeeded: true } });
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
