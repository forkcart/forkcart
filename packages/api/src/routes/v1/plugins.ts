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

  // ─── Health Check Route ───────────────────────────────────────────────────

  /** Get health status of all active plugins */
  router.get('/health', async (c) => {
    const health = await pluginLoader.healthCheck();
    const allHealthy = health.every((h) => h.healthy);
    return c.json({ data: health, allHealthy }, allHealthy ? 200 : 503);
  });

  return router;
}

/** Mount plugin custom routes under /api/v1/plugins/<pluginName>/ */
export function mountPluginRoutes(
  parentRouter: Hono,
  pluginLoader: PluginLoader,
  basePath: string = '',
): void {
  const registrars = pluginLoader.getPluginRouteRegistrars();

  for (const [pluginName, registrar] of registrars) {
    const pluginRouter = new Hono();

    // Slugify plugin name for URL (e.g., "FOMO Badges" -> "fomo-badges")
    const pluginSlug = pluginName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Get the plugin context (settings, db, etc.) from the loader
    const pluginContext = pluginLoader.getPluginContext(pluginName) as {
      settings?: Record<string, unknown>;
      db?: unknown;
      logger?: unknown;
    } | null;

    // Create a wrapper that injects plugin context into Hono context
    const wrap = (handler: (c: unknown) => unknown) => (c: Context) => {
      // Inject plugin-specific context variables
      if (pluginContext) {
        c.set('pluginSettings', pluginContext.settings || {});
        c.set('db', pluginContext.db);
        c.set('logger', pluginContext.logger);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return handler(c) as any;
    };

    const routerAdapter = {
      get: (path: string, handler: (c: unknown) => unknown) =>
        pluginRouter.get(path, wrap(handler)),
      post: (path: string, handler: (c: unknown) => unknown) =>
        pluginRouter.post(path, wrap(handler)),
      put: (path: string, handler: (c: unknown) => unknown) =>
        pluginRouter.put(path, wrap(handler)),
      delete: (path: string, handler: (c: unknown) => unknown) =>
        pluginRouter.delete(path, wrap(handler)),
      patch: (path: string, handler: (c: unknown) => unknown) =>
        pluginRouter.patch(path, wrap(handler)),
    };

    try {
      registrar(routerAdapter);
      // Mount under /api/v1/public/plugins/<pluginSlug>/
      const routePath = basePath ? `${basePath}/plugins/${pluginSlug}` : `/plugins/${pluginSlug}`;
      parentRouter.route(routePath, pluginRouter);
      console.log(`[plugins] Mounted custom routes for plugin: ${pluginName} at ${routePath}`);
    } catch (error) {
      console.error(`[plugins] Failed to mount routes for plugin: ${pluginName}`, error);
    }
  }
}
