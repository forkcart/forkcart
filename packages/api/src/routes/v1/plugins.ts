import { Hono } from 'hono';
import type { PluginLoader, PluginScheduler } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import type { Context } from 'hono';

const UpdateSettingsSchema = z.record(z.string(), z.unknown());

const TogglePluginSchema = z.object({
  isActive: z.boolean(),
});

const InstallPluginSchema = z.object({
  packageName: z.string().min(1),
});

const ToggleTaskSchema = z.object({
  enabled: z.boolean(),
});

/** Public plugin routes (no auth required, for storefront) */
export function createPublicPluginRoutes(pluginLoader: PluginLoader) {
  const router = new Hono();

  /** Get content for a storefront slot */
  router.get('/slots/:slotName', async (c) => {
    const slotName = c.req.param('slotName');
    const currentPage = c.req.query('page');

    const contents = pluginLoader.getStorefrontSlotContent(slotName, currentPage);

    return c.json({ data: contents });
  });

  /** Get all registered PageBuilder blocks (for admin block picker) */
  router.get('/blocks', async (c) => {
    const blocks = pluginLoader.getAllPageBuilderBlocks();
    return c.json({ data: blocks });
  });

  /**
   * Get fallback blocks NOT placed in the current page's PageBuilder template.
   * Query params:
   *   - page: current page path (e.g., '/product/xyz')
   *   - placed: comma-separated list of "pluginName:blockName" keys already in the template
   */
  router.get('/blocks/fallbacks', async (c) => {
    const currentPage = c.req.query('page');
    const placedParam = c.req.query('placed') ?? '';
    const placedKeys = placedParam ? placedParam.split(',').map((k) => k.trim()) : [];

    const fallbacks = pluginLoader.getPageBuilderBlockFallbacks(placedKeys, currentPage);
    return c.json({ data: fallbacks });
  });

  /** List all registered storefront pages */
  router.get('/pages', async (c) => {
    const pages = pluginLoader.getStorefrontPages();
    return c.json({ data: pages });
  });

  /** Get content for a specific storefront page */
  router.get('/pages/*', async (c) => {
    // Extract path from the URL after /pages
    const fullPath = c.req.path;
    const pagesIdx = fullPath.indexOf('/pages/');
    const pagePath = pagesIdx >= 0 ? fullPath.slice(pagesIdx + '/pages'.length) : '/';

    const page = pluginLoader.getStorefrontPage(pagePath);
    if (!page) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Page not found' } }, 404);
    }

    // If page has static content, return it directly
    if (page.content) {
      return c.json({
        data: {
          ...page,
          html: page.content,
          source: 'static',
        },
      });
    }

    // If page has a contentRoute, call the plugin's route internally
    if (page.contentRoute) {
      try {
        const pluginSlug = page.pluginName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const routePath = page.contentRoute.startsWith('/')
          ? page.contentRoute
          : `/${page.contentRoute}`;
        const internalUrl = `${c.req.url.split('/api/')[0]}/api/v1/public/plugins/${pluginSlug}${routePath}`;

        const response = await fetch(internalUrl, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const result = (await response.json()) as { html?: string };
          return c.json({
            data: {
              ...page,
              html: result.html ?? '',
              source: 'api',
            },
          });
        }

        return c.json(
          {
            error: {
              code: 'CONTENT_FETCH_FAILED',
              message: `contentRoute returned HTTP ${response.status}`,
            },
          },
          502,
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return c.json({ error: { code: 'CONTENT_FETCH_FAILED', message: errMsg } }, 502);
      }
    }

    // No content configured
    return c.json({
      data: {
        ...page,
        html: '',
        source: 'empty',
      },
    });
  });

  /** List all available slots (for debugging/admin preview) */
  router.get('/slots', async (c) => {
    const allSlots = pluginLoader.getAllStorefrontSlots();
    const result: Record<string, Array<{ pluginName: string; order: number }>> = {};

    for (const [slotName, contents] of allSlots) {
      result[slotName] = contents.map(({ pluginName, order }) => ({ pluginName, order }));
    }

    return c.json({ data: result });
  });

  return router;
}

/** Plugin management routes (admin only, behind auth) */
export function createPluginRoutes(pluginLoader: PluginLoader, scheduler?: PluginScheduler) {
  const router = new Hono();

  /** List all plugins */
  router.get('/', async (c) => {
    const plugins = await pluginLoader.getAllPlugins();
    return c.json({ data: plugins });
  });

  /** Toggle plugin active/inactive */
  router.put('/:id/toggle', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const { isActive } = TogglePluginSchema.parse(body);
    await pluginLoader.setPluginActive(id, isActive);
    // Refresh scheduler when plugins are toggled
    if (scheduler) {
      await scheduler.refresh();
    }
    return c.json({ data: { success: true, isActive } });
  });

  /** Update plugin settings */
  router.put('/:id/settings', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const settings = UpdateSettingsSchema.parse(body);
    await pluginLoader.updatePluginSettings(id, settings);
    return c.json({ data: { success: true } });
  });

  /** Install a plugin from npm */
  router.post('/install', async (c) => {
    const body = await c.req.json();
    const { packageName } = InstallPluginSchema.parse(body);
    const def = await pluginLoader.installPlugin(packageName);
    if (!def) {
      return c.json(
        { error: { code: 'INSTALL_FAILED', message: 'Plugin installation failed' } },
        400,
      );
    }
    const pluginId = await pluginLoader.ensurePluginInDb(def);
    return c.json({ data: { success: true, pluginId, name: def.name, version: def.version } }, 201);
  });

  /** Uninstall a plugin */
  router.delete('/:id/uninstall', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    // We need the plugin name to uninstall
    const allPlugins = await pluginLoader.getAllPlugins();
    const plugin = allPlugins.find((p) => p.id === id);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    // Check if this is a registry-installed plugin by querying raw DB metadata
    const dbResult = await (
      pluginLoader as unknown as { db: { execute: (q: unknown) => Promise<unknown> } }
    ).db.execute(sql`SELECT metadata FROM plugins WHERE id = ${id}`);
    const rows =
      (dbResult as { rows?: Array<{ metadata: Record<string, unknown> | null }> }).rows ??
      (dbResult as Array<{ metadata: Record<string, unknown> | null }>);
    const metadata = Array.isArray(rows) ? rows[0]?.metadata : null;

    if (metadata && metadata.source === 'registry') {
      // Registry plugins: deactivate, delete from DB, remove extracted files
      if (plugin.isActive) {
        await pluginLoader.setPluginActive(id, false);
      }
      await (
        pluginLoader as unknown as { db: { execute: (q: unknown) => Promise<unknown> } }
      ).db.execute(sql`DELETE FROM plugins WHERE id = ${id}`);
      const targetDir = metadata.installedTo as string;
      if (targetDir) {
        await rm(targetDir, { recursive: true, force: true }).catch(() => {});
      }
    } else {
      await pluginLoader.uninstallPlugin(plugin.name);
    }

    // Refresh scheduler after uninstall
    if (scheduler) {
      await scheduler.refresh();
    }
    return c.json({ data: { success: true } });
  });

  /** Discover plugins in node_modules */
  router.post('/discover', async (c) => {
    const discovered = await pluginLoader.discoverPlugins();
    // Ensure discovered plugins are in the DB
    for (const def of discovered) {
      await pluginLoader.ensurePluginInDb(def);
    }
    return c.json({
      data: discovered.map((d) => ({
        name: d.name,
        version: d.version,
        type: d.type,
        description: d.description,
        author: d.author,
      })),
    });
  });

  // ─── Scheduled Tasks Routes ─────────────────────────────────────────────────

  /** List all scheduled tasks */
  router.get('/tasks', async (c) => {
    if (!scheduler) {
      return c.json({ data: [] });
    }
    const tasks = scheduler.getAllTasks();
    return c.json({ data: tasks });
  });

  /** Manually run a scheduled task */
  router.post('/tasks/:taskKey/run', async (c) => {
    if (!scheduler) {
      return c.json(
        { error: { code: 'SCHEDULER_NOT_AVAILABLE', message: 'Scheduler is not running' } },
        503,
      );
    }

    const taskKey = c.req.param('taskKey');
    const task = scheduler.getTask(taskKey);

    if (!task) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
    }

    try {
      await scheduler.runTask(taskKey);
      // Return updated task state
      const updatedTask = scheduler.getTask(taskKey);
      return c.json({ data: { success: true, task: updatedTask } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: { code: 'TASK_EXECUTION_FAILED', message } }, 500);
    }
  });

  /** Enable/disable a scheduled task */
  router.put('/tasks/:taskKey/toggle', async (c) => {
    if (!scheduler) {
      return c.json(
        { error: { code: 'SCHEDULER_NOT_AVAILABLE', message: 'Scheduler is not running' } },
        503,
      );
    }

    const taskKey = c.req.param('taskKey');
    const task = scheduler.getTask(taskKey);

    if (!task) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found' } }, 404);
    }

    const body = await c.req.json();
    const { enabled } = ToggleTaskSchema.parse(body);

    scheduler.toggleTask(taskKey, enabled);

    // Return updated task state
    const updatedTask = scheduler.getTask(taskKey);
    return c.json({ data: { success: true, task: updatedTask } });
  });

  // ─── Admin Pages Routes ────────────────────────────────────────────────────

  /** Get admin pages for all active plugins */
  router.get('/admin-pages', async (c) => {
    const pages = pluginLoader.getAllAdminPages();
    return c.json({ data: pages });
  });

  /** Get admin page content for a specific plugin page */
  router.get('/admin-pages/:pluginId/content', async (c) => {
    const pluginId = c.req.param('pluginId');
    const pagePath = c.req.query('path') ?? '/';

    // Find the plugin by ID to get its name
    const allPlugins = await pluginLoader.getAllPlugins();
    const plugin = allPlugins.find((p) => p.id === pluginId);

    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    if (!plugin.isActive) {
      return c.json({ error: { code: 'INACTIVE', message: 'Plugin is not active' } }, 400);
    }

    // 1. Check for static content
    const staticContent = pluginLoader.getPluginAdminPageContent(plugin.name, pagePath);
    if (staticContent) {
      return c.json({ data: { html: staticContent, source: 'static' } });
    }

    // 2. Check for apiRoute — call the plugin's route internally
    const apiRoute = pluginLoader.getPluginAdminPageApiRoute(plugin.name, pagePath);
    if (apiRoute) {
      try {
        // Build the internal plugin route URL
        const pluginSlug = plugin.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const routePath = apiRoute.startsWith('/') ? apiRoute : `/${apiRoute}`;
        const internalUrl = `${c.req.url.split('/api/')[0]}/api/v1/public/plugins/${pluginSlug}${routePath}`;

        const response = await fetch(internalUrl, {
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const result = (await response.json()) as { html?: string };
          return c.json({ data: { html: result.html ?? '', source: 'api' } });
        }

        // apiRoute returned non-OK status
        console.error(`[plugins] apiRoute for ${plugin.name} returned ${response.status}`);
        return c.json({
          data: {
            html: `<div style="text-align:center;padding:2rem;color:#dc2626"><p style="font-weight:600;">Plugin content error</p><p style="font-size:0.85em;margin-top:0.5rem;color:#888">apiRoute <code>${apiRoute}</code> returned HTTP ${response.status}</p></div>`,
            source: 'error',
          },
        });
      } catch (error) {
        console.error(
          `[plugins] Failed to fetch admin page content via apiRoute for ${plugin.name}:`,
          error,
        );
        // apiRoute exists but failed — show error instead of misleading "no content" message
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        return c.json({
          data: {
            html: `<div style="text-align:center;padding:2rem;color:#dc2626"><p style="font-weight:600;">Failed to load plugin content</p><p style="font-size:0.85em;margin-top:0.5rem;color:#888">apiRoute <code>${apiRoute}</code> returned an error: ${errMsg}</p></div>`,
            source: 'error',
          },
        });
      }
    }

    // 3. No content configured
    return c.json({
      data: {
        html: `<div style="text-align:center;padding:2rem;color:#888"><p>No content configured for this page.</p><p style="font-size:0.85em;margin-top:0.5rem">Add <code>content</code> or <code>apiRoute</code> to your plugin's admin page definition.</p></div>`,
        source: 'default',
      },
    });
  });

  // ─── Health Check Routes ──────────────────────────────────────────────────

  /** Get health status of all active plugins */
  router.get('/health', async (c) => {
    const health = await pluginLoader.healthCheck();
    const allHealthy = health.every((h) => h.healthy);
    return c.json({ data: health, allHealthy }, allHealthy ? 200 : 503);
  });

  /** Detailed health check for a specific plugin */
  router.get('/:id/health', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    try {
      const report = await pluginLoader.getPluginHealth(id);
      return c.json({ data: report }, report.healthy ? 200 : 503);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return c.json({ error: { code: 'NOT_FOUND', message } }, 404);
      }
      return c.json({ error: { code: 'HEALTH_CHECK_FAILED', message } }, 500);
    }
  });

  // ─── Conflict Detection Route ─────────────────────────────────────────────

  /** Detect conflicts between active plugins */
  router.get('/conflicts', async (c) => {
    const conflicts = pluginLoader.detectConflicts();
    return c.json({ data: conflicts, hasConflicts: conflicts.length > 0 });
  });

  // ─── Dev Mode / Hot Reload Routes ─────────────────────────────────────────

  /** Manually reload a plugin (admin only) */
  router.post('/:id/reload', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });

    // Find plugin name from ID
    const allPlugins = await pluginLoader.getAllPlugins();
    const plugin = allPlugins.find((p) => p.id === id);
    if (!plugin) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin not found' } }, 404);
    }

    try {
      await pluginLoader.reloadPlugin(plugin.name);
      return c.json({
        data: { success: true, pluginName: plugin.name, reloadedAt: new Date().toISOString() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reload failed';
      return c.json({ error: { code: 'RELOAD_FAILED', message } }, 500);
    }
  });

  return router;
}

/**
 * Build a Hono sub-router for a plugin's custom routes.
 */
function buildPluginRouter(
  pluginName: string,
  registrar: (router: unknown) => void,
  pluginLoader: PluginLoader,
): Hono {
  const pluginRouter = new Hono();

  const pluginContext = pluginLoader.getPluginContext(pluginName) as {
    settings?: Record<string, unknown>;
    db?: unknown;
    logger?: unknown;
  } | null;

  const wrap = (handler: (c: unknown) => unknown) => (c: Context) => {
    if (pluginContext) {
      c.set('pluginSettings', pluginContext.settings || {});
      c.set('db', pluginContext.db);
      c.set('logger', pluginContext.logger);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return handler(c) as any;
  };

  const routerAdapter = {
    get: (path: string, handler: (c: unknown) => unknown) => pluginRouter.get(path, wrap(handler)),
    post: (path: string, handler: (c: unknown) => unknown) =>
      pluginRouter.post(path, wrap(handler)),
    put: (path: string, handler: (c: unknown) => unknown) => pluginRouter.put(path, wrap(handler)),
    delete: (path: string, handler: (c: unknown) => unknown) =>
      pluginRouter.delete(path, wrap(handler)),
    patch: (path: string, handler: (c: unknown) => unknown) =>
      pluginRouter.patch(path, wrap(handler)),
  };

  registrar(routerAdapter);
  return pluginRouter;
}

/** Slugify a plugin name for URL use (e.g., "FOMO Badges" -> "fomo-badges") */
function slugifyPluginName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Mount plugin custom routes dynamically using a wildcard catch-all handler.
 *
 * Instead of statically mounting each plugin's routes at startup (which means
 * plugins installed/activated AFTER startup won't have their routes available),
 * this registers a single wildcard route that resolves the correct plugin router
 * at request time. Plugin routers are cached and invalidated when the set of
 * registered route registrars changes (e.g., after plugin activation/deactivation/reload).
 */
export function mountPluginRoutes(
  parentRouter: Hono,
  pluginLoader: PluginLoader,
  basePath: string = '',
): void {
  // Cache: slug -> built Hono router
  const routerCache = new Map<string, Hono>();
  // Snapshot of registrar keys to detect changes
  let lastRegistrarSnapshot = '';

  const invalidateStaleCaches = () => {
    const registrars = pluginLoader.getPluginRouteRegistrars();
    const currentSnapshot = [...registrars.keys()].map(slugifyPluginName).sort().join(',');

    if (currentSnapshot !== lastRegistrarSnapshot) {
      routerCache.clear();
      lastRegistrarSnapshot = currentSnapshot;
    }
  };

  const routePath = basePath ? `${basePath}/plugins/:slug/*` : `/plugins/:slug/*`;

  parentRouter.all(routePath, async (c) => {
    const slug = c.req.param('slug');
    if (!slug) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Plugin slug required' } }, 404);
    }

    // Invalidate stale caches if registrars changed (lightweight key comparison)
    invalidateStaleCaches();

    // Check cache
    let pluginRouter = routerCache.get(slug);

    if (!pluginRouter) {
      // Find the registrar for this slug
      const registrars = pluginLoader.getPluginRouteRegistrars();
      let matchedName: string | undefined;
      let matchedRegistrar: ((router: unknown) => void) | undefined;

      for (const [pluginName, registrar] of registrars) {
        if (slugifyPluginName(pluginName) === slug) {
          matchedName = pluginName;
          matchedRegistrar = registrar;
          break;
        }
      }

      if (!matchedName || !matchedRegistrar) {
        return c.json(
          { error: { code: 'NOT_FOUND', message: `No routes registered for plugin: ${slug}` } },
          404,
        );
      }

      try {
        pluginRouter = buildPluginRouter(matchedName, matchedRegistrar, pluginLoader);
        routerCache.set(slug, pluginRouter);
        console.log(`[plugins] Built dynamic router for plugin: ${matchedName} (slug: ${slug})`);
      } catch (error) {
        console.error(`[plugins] Failed to build router for plugin: ${matchedName}`, error);
        return c.json(
          { error: { code: 'PLUGIN_ROUTE_ERROR', message: 'Failed to initialize plugin routes' } },
          500,
        );
      }
    }

    // Strip prefix so the plugin router sees clean sub-paths
    const fullPath = c.req.path;
    const pluginPrefix = basePath ? `${basePath}/plugins/${slug}` : `/plugins/${slug}`;
    const subPath = fullPath.slice(fullPath.indexOf(pluginPrefix) + pluginPrefix.length) || '/';

    const url = new URL(c.req.url);
    url.pathname = subPath;

    const subRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
      duplex: 'half',
    } as RequestInit);

    return pluginRouter.fetch(subRequest);
  });

  console.log(`[plugins] Dynamic plugin route handler registered at ${routePath}`);
}
