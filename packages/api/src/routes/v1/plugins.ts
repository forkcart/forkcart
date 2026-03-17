import { Hono } from 'hono';
import type { PluginLoader, PluginScheduler } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';

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
    await pluginLoader.uninstallPlugin(plugin.name);
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

  return router;
}
