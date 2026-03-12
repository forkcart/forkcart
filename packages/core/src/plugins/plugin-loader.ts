import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { plugins, pluginSettings } from '@forkcart/database/schemas';
import type { PaymentProvider } from '../payments/provider';
import type { PaymentProviderRegistry } from '../payments/registry';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-loader');

/** Plugin registration info */
export interface PluginDefinition {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'payment' | 'shipping' | 'notification' | 'general';
  /** Factory function that creates the provider instance */
  createProvider?: () => PaymentProvider;
  /** Required settings with defaults */
  defaultSettings?: Record<string, unknown>;
}

/**
 * Loads plugins from the DB and initializes them.
 * Built-in plugins are registered via code; the DB tracks activation + settings.
 */
export class PluginLoader {
  private knownPlugins = new Map<string, PluginDefinition>();

  constructor(
    private readonly db: Database,
    private readonly paymentRegistry: PaymentProviderRegistry,
  ) {}

  /** Register a plugin definition (called at app startup) */
  registerDefinition(def: PluginDefinition): void {
    this.knownPlugins.set(def.name, def);
    logger.debug({ pluginName: def.name }, 'Plugin definition registered');
  }

  /** Ensure a plugin exists in the DB (upsert) */
  async ensurePluginInDb(def: PluginDefinition): Promise<string> {
    const existing = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, def.name),
    });

    if (existing) {
      // Update version if changed
      if (existing.version !== def.version) {
        await this.db.update(plugins)
          .set({ version: def.version, description: def.description, updatedAt: new Date() })
          .where(eq(plugins.id, existing.id));
      }
      return existing.id;
    }

    const [plugin] = await this.db.insert(plugins).values({
      name: def.name,
      version: def.version,
      description: def.description,
      author: def.author,
      isActive: false,
      entryPoint: def.type,
      metadata: { type: def.type },
    }).returning();

    if (!plugin) throw new Error(`Failed to insert plugin: ${def.name}`);

    // Insert default settings
    if (def.defaultSettings) {
      for (const [key, value] of Object.entries(def.defaultSettings)) {
        await this.db.insert(pluginSettings).values({
          pluginId: plugin.id,
          key,
          value,
        });
      }
    }

    logger.info({ pluginName: def.name, pluginId: plugin.id }, 'Plugin registered in DB');
    return plugin.id;
  }

  /** Load and initialize all active plugins */
  async loadActivePlugins(): Promise<void> {
    // First, ensure all known plugins are in the DB
    for (const def of this.knownPlugins.values()) {
      await this.ensurePluginInDb(def);
    }

    // Then load active plugins
    const activePlugins = await this.db.query.plugins.findMany({
      where: eq(plugins.isActive, true),
      with: { settings: true },
    });

    for (const plugin of activePlugins) {
      const def = this.knownPlugins.get(plugin.name);
      if (!def) {
        logger.warn({ pluginName: plugin.name }, 'Active plugin has no registered definition, skipping');
        continue;
      }

      // Build settings map
      const settings: Record<string, unknown> = {};
      for (const s of plugin.settings) {
        settings[s.key] = s.value;
      }

      // Initialize based on type
      if (def.type === 'payment' && def.createProvider) {
        const provider = def.createProvider();
        await provider.initialize(settings);
        this.paymentRegistry.register(provider);
        logger.info({ pluginName: plugin.name }, 'Payment provider plugin loaded');
      }
    }

    logger.info(
      { activeCount: activePlugins.length, totalKnown: this.knownPlugins.size },
      'Plugin loading complete',
    );
  }

  /** Get all plugins (for admin API) */
  async getAllPlugins() {
    const allPlugins = await this.db.query.plugins.findMany({
      with: { settings: true },
    });

    return allPlugins.map((p) => {
      const def = this.knownPlugins.get(p.name);
      const provider = def?.createProvider?.();
      return {
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        type: (p.metadata as Record<string, string>)?.type ?? 'general',
        isActive: p.isActive,
        settings: p.settings.map((s) => ({
          key: s.key,
          value: s.key.toLowerCase().includes('secret') || s.key.toLowerCase().includes('key')
            ? (s.value ? '••••••••' : null)  // mask secrets
            : s.value,
        })),
        requiredSettings: provider?.getRequiredSettings() ?? [],
        installedAt: p.installedAt,
      };
    });
  }

  /** Activate/deactivate a plugin */
  async setPluginActive(pluginId: string, active: boolean): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
      with: { settings: true },
    });

    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    await this.db.update(plugins)
      .set({ isActive: active, updatedAt: new Date() })
      .where(eq(plugins.id, pluginId));

    const def = this.knownPlugins.get(plugin.name);

    if (active && def?.type === 'payment' && def.createProvider) {
      // Initialize and register
      const provider = def.createProvider();
      const settings: Record<string, unknown> = {};
      for (const s of plugin.settings) {
        settings[s.key] = s.value;
      }
      await provider.initialize(settings);
      this.paymentRegistry.register(provider);
      logger.info({ pluginName: plugin.name }, 'Plugin activated');
    } else if (!active && def?.type === 'payment') {
      // Unregister
      const provider = def.createProvider?.();
      if (provider) {
        this.paymentRegistry.unregister(provider.id);
      }
      logger.info({ pluginName: plugin.name }, 'Plugin deactivated');
    }
  }

  /** Update plugin settings */
  async updatePluginSettings(pluginId: string, newSettings: Record<string, unknown>): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
      with: { settings: true },
    });

    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    for (const [key, value] of Object.entries(newSettings)) {
      const existing = plugin.settings.find((s) => s.key === key);
      if (existing) {
        await this.db.update(pluginSettings)
          .set({ value: value as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(pluginSettings.id, existing.id));
      } else {
        await this.db.insert(pluginSettings).values({
          pluginId,
          key,
          value: value as Record<string, unknown>,
        });
      }
    }

    // If plugin is active, re-initialize provider with new settings
    if (plugin.isActive) {
      const def = this.knownPlugins.get(plugin.name);
      if (def?.type === 'payment' && def.createProvider) {
        const provider = def.createProvider();
        const mergedSettings: Record<string, unknown> = {};
        for (const s of plugin.settings) {
          mergedSettings[s.key] = s.value;
        }
        Object.assign(mergedSettings, newSettings);
        await provider.initialize(mergedSettings);
        this.paymentRegistry.register(provider);
        logger.info({ pluginName: plugin.name }, 'Plugin re-initialized with new settings');
      }
    }

    logger.info({ pluginId, keys: Object.keys(newSettings) }, 'Plugin settings updated');
  }
}
