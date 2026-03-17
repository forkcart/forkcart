import { Hono } from 'hono';
import type { PluginLoader } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';

const UpdateSettingsSchema = z.record(z.string(), z.unknown());

const TogglePluginSchema = z.object({
  isActive: z.boolean(),
});

const InstallPluginSchema = z.object({
  packageName: z.string().min(1),
});

/** Plugin management routes (admin only, behind auth) */
export function createPluginRoutes(pluginLoader: PluginLoader) {
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

  return router;
}
