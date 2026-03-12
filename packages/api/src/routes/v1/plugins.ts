import { Hono } from 'hono';
import type { PluginLoader } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';

const UpdateSettingsSchema = z.record(z.string(), z.unknown());

const TogglePluginSchema = z.object({
  isActive: z.boolean(),
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

  return router;
}
