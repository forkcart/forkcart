import { eq } from 'drizzle-orm';
import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Database } from '@forkcart/database';
import { plugins, pluginSettings } from '@forkcart/database/schemas';
import type { PaymentProvider } from '../payments/provider';
import type { PaymentProviderRegistry } from '../payments/registry';
import type { EmailProvider } from '../email/provider';
import type { EmailProviderRegistry } from '../email/registry';
import type { MarketplaceProvider } from '../marketplace/types';
import type { MarketplaceProviderRegistry } from '../marketplace/registry';
import type { EventBus } from './event-bus';
import type { EventHandler } from './types';
import { createLogger } from '../lib/logger';

const execAsync = promisify(exec);
const logger = createLogger('plugin-loader');

// ─── Legacy definition (backward compat with existing registerDefinition calls) ─

/** @deprecated Use `@forkcart/plugin-sdk` PluginDefinition instead */
export interface LegacyPluginDefinition {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'payment' | 'shipping' | 'notification' | 'marketplace' | 'general';
  createProvider?: () => PaymentProvider;
  createEmailProvider?: () => EmailProvider;
  createMarketplaceProvider?: () => MarketplaceProvider;
  defaultSettings?: Record<string, unknown>;
}

// Re-export as PluginDefinition for backward compat
export type { LegacyPluginDefinition as PluginDefinition };

// ─── SDK Plugin Definition (new format from @forkcart/plugin-sdk) ───────────

/** Minimal shape we expect from an SDK-style plugin definition */
interface SdkPluginDefinition {
  name: string;
  version: string;
  type: string;
  description: string;
  author: string;
  settings?: Record<
    string,
    {
      type: string;
      default?: unknown;
      required?: boolean;
      secret?: boolean;
      label?: string;
      options?: string[];
    }
  >;
  onActivate?: (ctx: unknown) => void | Promise<void>;
  onDeactivate?: (ctx: unknown) => void | Promise<void>;
  hooks?: Record<string, (event: unknown, ctx: unknown) => void | Promise<void>>;
  provider?: Record<string, unknown>;
  adminPages?: Array<{ path: string; label: string; icon?: string }>;
  routes?: (router: unknown) => void;
}

/** Track registered hook handlers per plugin so we can unregister them */
interface ActivePluginState {
  pluginName: string;
  registeredHooks: Map<string, EventHandler<unknown>>;
}

/**
 * Unified plugin loader — handles both legacy registerDefinition() plugins
 * and new SDK-style `definePlugin()` plugins discovered from node_modules.
 */
export class PluginLoader {
  private legacyPlugins = new Map<string, LegacyPluginDefinition>();
  private sdkPlugins = new Map<string, SdkPluginDefinition>();
  private activeStates = new Map<string, ActivePluginState>();

  constructor(
    private readonly db: Database,
    private readonly paymentRegistry: PaymentProviderRegistry,
    private readonly emailRegistry?: EmailProviderRegistry,
    private readonly marketplaceRegistry?: MarketplaceProviderRegistry,
    private readonly eventBus?: EventBus,
  ) {}

  // ─── Legacy API (backward compat) ──────────────────────────────────────────

  /** Register a legacy plugin definition (called at app startup) */
  registerDefinition(def: LegacyPluginDefinition): void {
    this.legacyPlugins.set(def.name, def);
    logger.debug({ pluginName: def.name }, 'Legacy plugin definition registered');
  }

  // ─── SDK Plugin API ────────────────────────────────────────────────────────

  /** Register an SDK-style plugin definition */
  registerSdkPlugin(def: SdkPluginDefinition): void {
    this.sdkPlugins.set(def.name, def);
    logger.debug({ pluginName: def.name }, 'SDK plugin definition registered');
  }

  // ─── Discovery ─────────────────────────────────────────────────────────────

  /** Scan node_modules for forkcart-plugin-* packages and return their definitions */
  async discoverPlugins(): Promise<SdkPluginDefinition[]> {
    const discovered: SdkPluginDefinition[] = [];
    const nodeModulesPath = resolve(process.cwd(), 'node_modules');

    try {
      const entries = await readdir(nodeModulesPath, { withFileTypes: true });

      for (const entry of entries) {
        // Check top-level forkcart-plugin-* packages
        if (entry.isDirectory() && entry.name.startsWith('forkcart-plugin-')) {
          const def = await this.tryLoadPluginFromPath(join(nodeModulesPath, entry.name));
          if (def) discovered.push(def);
        }
        // Check @forkcart scoped packages
        if (entry.isDirectory() && entry.name === '@forkcart') {
          const scopedPath = join(nodeModulesPath, '@forkcart');
          const scopedEntries = await readdir(scopedPath, { withFileTypes: true });
          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.isDirectory() && scopedEntry.name.startsWith('plugin-')) {
              const def = await this.tryLoadPluginFromPath(join(scopedPath, scopedEntry.name));
              if (def) discovered.push(def);
            }
          }
        }
      }
    } catch {
      logger.warn('Could not scan node_modules for plugins');
    }

    logger.info({ count: discovered.length }, 'Plugin discovery complete');
    return discovered;
  }

  /** Try to import a plugin from a given path */
  private async tryLoadPluginFromPath(pkgPath: string): Promise<SdkPluginDefinition | null> {
    try {
      const pkgJsonPath = join(pkgPath, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
      const keywords = (pkgJson['keywords'] ?? []) as string[];

      // Must have "forkcart-plugin" keyword or name matching pattern
      const name = pkgJson['name'] as string;
      if (
        !keywords.includes('forkcart-plugin') &&
        !name.startsWith('forkcart-plugin-') &&
        !name.startsWith('@forkcart/plugin-')
      ) {
        return null;
      }

      // Already registered?
      if (this.sdkPlugins.has(name) || this.legacyPlugins.has(name)) {
        return null;
      }

      return await this.loadPlugin(name);
    } catch {
      return null;
    }
  }

  /** Dynamically import a plugin by package name */
  async loadPlugin(packageName: string): Promise<SdkPluginDefinition | null> {
    try {
      const mod = (await import(packageName)) as Record<string, unknown>;
      const def = (mod['default'] ?? mod) as SdkPluginDefinition;

      if (!def.name || !def.version || !def.type) {
        logger.warn({ packageName }, 'Invalid plugin definition — missing name/version/type');
        return null;
      }

      this.registerSdkPlugin(def);
      return def;
    } catch (error) {
      logger.error({ packageName, error }, 'Failed to load plugin');
      return null;
    }
  }

  // ─── Install / Uninstall ──────────────────────────────────────────────────

  /** Install a plugin package via pnpm */
  async installPlugin(packageName: string): Promise<SdkPluginDefinition | null> {
    logger.info({ packageName }, 'Installing plugin');
    try {
      await execAsync(`pnpm add ${packageName}`, { cwd: process.cwd() });
      return await this.loadPlugin(packageName);
    } catch (error) {
      logger.error({ packageName, error }, 'Failed to install plugin');
      throw new Error(`Failed to install plugin: ${packageName}`);
    }
  }

  /** Uninstall a plugin package */
  async uninstallPlugin(packageName: string): Promise<void> {
    logger.info({ packageName }, 'Uninstalling plugin');

    // Deactivate first if active
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, packageName),
    });
    if (plugin?.isActive) {
      await this.deactivatePlugin(plugin.id);
    }

    try {
      await execAsync(`pnpm remove ${packageName}`, { cwd: process.cwd() });
      this.sdkPlugins.delete(packageName);
    } catch (error) {
      logger.error({ packageName, error }, 'Failed to uninstall plugin');
      throw new Error(`Failed to uninstall plugin: ${packageName}`);
    }
  }

  // ─── DB sync ──────────────────────────────────────────────────────────────

  /** Ensure a plugin exists in the DB (upsert) */
  async ensurePluginInDb(
    def: LegacyPluginDefinition | SdkPluginDefinition,
    pluginType?: string,
  ): Promise<string> {
    const type = pluginType ?? def.type;

    const existing = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, def.name),
    });

    if (existing) {
      if (existing.version !== def.version) {
        await this.db
          .update(plugins)
          .set({ version: def.version, description: def.description, updatedAt: new Date() })
          .where(eq(plugins.id, existing.id));
      }
      return existing.id;
    }

    // Build default settings from either legacy or SDK format
    const defaultSettings: Record<string, unknown> = {};
    if ('defaultSettings' in def && def.defaultSettings) {
      Object.assign(defaultSettings, def.defaultSettings);
    } else if ('settings' in def && def.settings) {
      for (const [key, schema] of Object.entries(def.settings)) {
        if (schema.default !== undefined) {
          defaultSettings[key] = schema.default;
        }
      }
    }

    const [plugin] = await this.db
      .insert(plugins)
      .values({
        name: def.name,
        version: def.version,
        description: def.description,
        author: def.author,
        isActive: false,
        entryPoint: type,
        metadata: { type },
      })
      .returning();

    if (!plugin) throw new Error(`Failed to insert plugin: ${def.name}`);

    for (const [key, value] of Object.entries(defaultSettings)) {
      await this.db.insert(pluginSettings).values({
        pluginId: plugin.id,
        key,
        value,
      });
    }

    logger.info({ pluginName: def.name, pluginId: plugin.id }, 'Plugin registered in DB');
    return plugin.id;
  }

  // ─── Activation / Deactivation ────────────────────────────────────────────

  /** Activate a plugin by its DB id */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
      with: { settings: true },
    });
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    const settings: Record<string, unknown> = {};
    for (const s of plugin.settings) {
      settings[s.key] = s.value;
    }

    // Try SDK plugin first, then legacy
    const sdkDef = this.sdkPlugins.get(plugin.name);
    if (sdkDef) {
      await this.activateSdkPlugin(plugin.name, sdkDef, settings);
    } else {
      const legacyDef = this.legacyPlugins.get(plugin.name);
      if (legacyDef) {
        await this.activateLegacyPlugin(legacyDef, settings);
      } else {
        logger.warn({ pluginName: plugin.name }, 'No definition found for plugin');
        return;
      }
    }

    await this.db
      .update(plugins)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(plugins.id, pluginId));

    // Emit plugin:activated event
    if (this.eventBus) {
      await this.eventBus.emit('plugin:activated', {
        pluginName: plugin.name,
        pluginVersion: plugin.version,
      });
    }

    logger.info({ pluginName: plugin.name }, 'Plugin activated');
  }

  /** Deactivate a plugin by its DB id */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
    });
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    const settings: Record<string, unknown> = {};
    const pluginSettingsRows = await this.db.query.pluginSettings.findMany({
      where: eq(pluginSettings.pluginId, pluginId),
    });
    for (const s of pluginSettingsRows) {
      settings[s.key] = s.value;
    }

    // Call onDeactivate for SDK plugins
    const sdkDef = this.sdkPlugins.get(plugin.name);
    if (sdkDef?.onDeactivate) {
      try {
        await sdkDef.onDeactivate(this.buildPluginContext(plugin.name, settings));
      } catch (error) {
        logger.error({ pluginName: plugin.name, error }, 'onDeactivate failed');
      }
    }

    // Unregister hooks
    const state = this.activeStates.get(plugin.name);
    if (state && this.eventBus) {
      this.eventBus.removeHandlers(state.registeredHooks);
    }
    this.activeStates.delete(plugin.name);

    // Unregister legacy providers
    const legacyDef = this.legacyPlugins.get(plugin.name);
    if (legacyDef) {
      this.deactivateLegacyPlugin(legacyDef);
    }

    await this.db
      .update(plugins)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(plugins.id, pluginId));

    if (this.eventBus) {
      await this.eventBus.emit('plugin:deactivated', { pluginName: plugin.name });
    }

    logger.info({ pluginName: plugin.name }, 'Plugin deactivated');
  }

  // ─── SDK plugin activation ────────────────────────────────────────────────

  private async activateSdkPlugin(
    pluginName: string,
    def: SdkPluginDefinition,
    settings: Record<string, unknown>,
  ): Promise<void> {
    const ctx = this.buildPluginContext(pluginName, settings);
    const hookHandlers = new Map<string, EventHandler<unknown>>();

    // Register hooks
    if (def.hooks && this.eventBus) {
      for (const [eventType, handler] of Object.entries(def.hooks)) {
        if (!handler) continue;
        const wrappedHandler: EventHandler<unknown> = async (event) => {
          try {
            await handler(event, ctx);
          } catch (error) {
            logger.error({ pluginName, eventType, error }, 'Plugin hook handler failed');
          }
        };
        this.eventBus.on(eventType, wrappedHandler);
        hookHandlers.set(eventType, wrappedHandler);
      }
    }

    this.activeStates.set(pluginName, {
      pluginName,
      registeredHooks: hookHandlers,
    });

    // Call onActivate
    if (def.onActivate) {
      await def.onActivate(ctx);
    }

    // Register provider based on type (bridge to existing registries)
    if (def.provider) {
      await this.bridgeProviderToRegistry(def, settings);
    }
  }

  // ─── Legacy plugin activation ─────────────────────────────────────────────

  private async activateLegacyPlugin(
    def: LegacyPluginDefinition,
    settings: Record<string, unknown>,
  ): Promise<void> {
    if (def.type === 'payment' && def.createProvider) {
      const provider = def.createProvider();
      await provider.initialize(settings);
      this.paymentRegistry.register(provider);
    } else if (def.type === 'notification' && def.createEmailProvider && this.emailRegistry) {
      const provider = def.createEmailProvider();
      await provider.initialize(settings);
      this.emailRegistry.register(provider);
    } else if (
      def.type === 'marketplace' &&
      def.createMarketplaceProvider &&
      this.marketplaceRegistry
    ) {
      const provider = def.createMarketplaceProvider();
      await provider.connect(settings);
      this.marketplaceRegistry.register(provider);
    }
  }

  private deactivateLegacyPlugin(def: LegacyPluginDefinition): void {
    if (def.type === 'payment' && def.createProvider) {
      const provider = def.createProvider();
      this.paymentRegistry.unregister(provider.id);
    } else if (def.type === 'notification' && def.createEmailProvider && this.emailRegistry) {
      const provider = def.createEmailProvider();
      this.emailRegistry.unregister(provider.id);
    } else if (
      def.type === 'marketplace' &&
      def.createMarketplaceProvider &&
      this.marketplaceRegistry
    ) {
      const provider = def.createMarketplaceProvider();
      this.marketplaceRegistry.unregister(provider.id);
    }
  }

  // ─── Provider bridging (SDK → existing registries) ────────────────────────

  private async bridgeProviderToRegistry(
    def: SdkPluginDefinition,
    settings: Record<string, unknown>,
  ): Promise<void> {
    const provider = def.provider;
    if (!provider) return;

    // Payment provider bridge
    if (
      def.type === 'payment' &&
      'createPaymentIntent' in provider &&
      typeof provider['createPaymentIntent'] === 'function'
    ) {
      const paymentBridge = this.createPaymentProviderBridge(def.name, provider, settings);
      this.paymentRegistry.register(paymentBridge);
    }

    // Email provider bridge
    if (
      def.type === 'email' &&
      'sendEmail' in provider &&
      typeof provider['sendEmail'] === 'function' &&
      this.emailRegistry
    ) {
      const emailBridge = this.createEmailProviderBridge(def.name, provider, settings);
      this.emailRegistry.register(emailBridge);
    }

    // Marketplace provider bridge
    if (
      def.type === 'marketplace' &&
      'listProduct' in provider &&
      typeof provider['listProduct'] === 'function' &&
      this.marketplaceRegistry
    ) {
      const marketplaceBridge = this.createMarketplaceProviderBridge(def.name, provider, settings);
      this.marketplaceRegistry.register(marketplaceBridge);
    }
  }

  private createPaymentProviderBridge(
    name: string,
    provider: Record<string, unknown>,
    _settings: Record<string, unknown>,
  ): PaymentProvider {
    const p = provider as Record<string, (...args: unknown[]) => unknown>;
    return {
      id: name,
      displayName: name,
      async initialize(s: Record<string, unknown>) {
        if (typeof p['initialize'] === 'function') await p['initialize'](s);
      },
      isConfigured: () => true,
      getClientConfig: () =>
        (typeof p['getClientConfig'] === 'function'
          ? p['getClientConfig']()
          : { providerId: name }) as ReturnType<PaymentProvider['getClientConfig']>,
      createPaymentIntent: (input: unknown) =>
        p['createPaymentIntent']!(input) as ReturnType<PaymentProvider['createPaymentIntent']>,
      verifyWebhook: (raw: string, headers: Record<string, string>) =>
        p['verifyWebhook']!(raw, headers) as ReturnType<PaymentProvider['verifyWebhook']>,
      getPaymentStatus: (id: string) =>
        p['getPaymentStatus']!(id) as ReturnType<PaymentProvider['getPaymentStatus']>,
      getRequiredSettings: () =>
        (typeof p['getRequiredSettings'] === 'function'
          ? p['getRequiredSettings']()
          : []) as ReturnType<PaymentProvider['getRequiredSettings']>,
    } satisfies PaymentProvider;
  }

  private createEmailProviderBridge(
    name: string,
    provider: Record<string, unknown>,
    _settings: Record<string, unknown>,
  ): EmailProvider {
    const p = provider as Record<string, (...args: unknown[]) => unknown>;
    return {
      id: name,
      displayName: name,
      async initialize(s: Record<string, unknown>) {
        if (typeof p['initialize'] === 'function') await p['initialize'](s);
      },
      isConfigured: () => true,
      sendEmail: (input: unknown) =>
        p['sendEmail']!(input) as ReturnType<EmailProvider['sendEmail']>,
      getRequiredSettings: () =>
        (typeof p['getRequiredSettings'] === 'function'
          ? p['getRequiredSettings']()
          : []) as ReturnType<EmailProvider['getRequiredSettings']>,
    } satisfies EmailProvider;
  }

  private createMarketplaceProviderBridge(
    name: string,
    provider: Record<string, unknown>,
    _settings: Record<string, unknown>,
  ): MarketplaceProvider {
    const p = provider as Record<string, (...args: unknown[]) => unknown>;
    return {
      id: name,
      name,
      async connect(s: Record<string, unknown>) {
        if (typeof p['connect'] === 'function') await p['connect'](s);
      },
      async disconnect() {
        if (typeof p['disconnect'] === 'function') await p['disconnect']();
      },
      testConnection: () =>
        (typeof p['testConnection'] === 'function'
          ? p['testConnection']()
          : Promise.resolve({ ok: true })) as ReturnType<MarketplaceProvider['testConnection']>,
      listProduct: (input: unknown) =>
        p['listProduct']!(input) as ReturnType<MarketplaceProvider['listProduct']>,
      updateListing: (id: string, input: unknown) =>
        p['updateListing']!(id, input) as ReturnType<MarketplaceProvider['updateListing']>,
      deleteListing: (id: string) =>
        p['deleteListing']!(id) as ReturnType<MarketplaceProvider['deleteListing']>,
      fetchOrders: (since?: Date) =>
        p['fetchOrders']!(since) as ReturnType<MarketplaceProvider['fetchOrders']>,
      acknowledgeOrder: (id: string) =>
        p['acknowledgeOrder']!(id) as ReturnType<MarketplaceProvider['acknowledgeOrder']>,
      updateShipment: (id: string, tracking: unknown) =>
        p['updateShipment']!(id, tracking) as ReturnType<MarketplaceProvider['updateShipment']>,
      updateInventory: (sku: string, qty: number) =>
        p['updateInventory']!(sku, qty) as ReturnType<MarketplaceProvider['updateInventory']>,
      bulkUpdateInventory: (items: unknown) =>
        p['bulkUpdateInventory']!(items) as ReturnType<MarketplaceProvider['bulkUpdateInventory']>,
      getMarketplaceCategories: () =>
        (typeof p['getMarketplaceCategories'] === 'function'
          ? p['getMarketplaceCategories']()
          : Promise.resolve([])) as ReturnType<MarketplaceProvider['getMarketplaceCategories']>,
    } satisfies MarketplaceProvider;
  }

  // ─── Plugin context builder ───────────────────────────────────────────────

  private buildPluginContext(pluginName: string, settings: Record<string, unknown>): unknown {
    const pluginLogger = {
      debug: (msg: string, data?: Record<string, unknown>) =>
        logger.debug({ pluginName, ...data }, msg),
      info: (msg: string, data?: Record<string, unknown>) =>
        logger.info({ pluginName, ...data }, msg),
      warn: (msg: string, data?: Record<string, unknown>) =>
        logger.warn({ pluginName, ...data }, msg),
      error: (msg: string, data?: Record<string, unknown>) =>
        logger.error({ pluginName, ...data }, msg),
    };

    return {
      settings,
      db: this.db,
      logger: pluginLogger,
      eventBus: this.eventBus ?? {
        on: () => {},
        off: () => {},
        emit: async () => {},
      },
    };
  }

  // ─── Load all active plugins (startup) ────────────────────────────────────

  async loadActivePlugins(): Promise<void> {
    // Ensure all known plugins are in the DB
    for (const def of this.legacyPlugins.values()) {
      await this.ensurePluginInDb(def);
    }
    for (const def of this.sdkPlugins.values()) {
      await this.ensurePluginInDb(def);
    }

    // Load active plugins
    const activePlugins = await this.db.query.plugins.findMany({
      where: eq(plugins.isActive, true),
      with: { settings: true },
    });

    for (const plugin of activePlugins) {
      const settings: Record<string, unknown> = {};
      for (const s of plugin.settings) {
        settings[s.key] = s.value;
      }

      const sdkDef = this.sdkPlugins.get(plugin.name);
      if (sdkDef) {
        await this.activateSdkPlugin(plugin.name, sdkDef, settings);
        logger.info({ pluginName: plugin.name }, 'SDK plugin loaded');
        continue;
      }

      const legacyDef = this.legacyPlugins.get(plugin.name);
      if (legacyDef) {
        await this.activateLegacyPlugin(legacyDef, settings);
        logger.info({ pluginName: plugin.name }, 'Legacy plugin loaded');
        continue;
      }

      logger.warn({ pluginName: plugin.name }, 'Active plugin has no registered definition');
    }

    logger.info(
      {
        activeCount: activePlugins.length,
        legacyCount: this.legacyPlugins.size,
        sdkCount: this.sdkPlugins.size,
      },
      'Plugin loading complete',
    );
  }

  // ─── Admin API helpers ────────────────────────────────────────────────────

  /** Get all plugins (for admin API) */
  async getAllPlugins() {
    const allPlugins = await this.db.query.plugins.findMany({
      with: { settings: true },
    });

    return allPlugins.map((p) => {
      const legacyDef = this.legacyPlugins.get(p.name);
      const sdkDef = this.sdkPlugins.get(p.name);
      const paymentProvider = legacyDef?.createProvider?.();
      const emailProvider = legacyDef?.createEmailProvider?.();

      // Build admin pages list from SDK plugins
      const adminPages = sdkDef?.adminPages ?? [];

      // Build settings schema from SDK plugins
      const settingsSchema = sdkDef?.settings
        ? Object.entries(sdkDef.settings).map(([key, schema]) => ({
            key,
            ...schema,
          }))
        : [];

      return {
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        type: (p.metadata as Record<string, string>)?.type ?? 'general',
        isActive: p.isActive,
        source: sdkDef ? 'sdk' : legacyDef ? 'legacy' : 'unknown',
        settings: p.settings.map((s) => ({
          key: s.key,
          value:
            s.key.toLowerCase().includes('secret') || s.key.toLowerCase().includes('key')
              ? s.value
                ? '••••••••'
                : null
              : s.value,
        })),
        settingsSchema,
        adminPages,
        requiredSettings:
          paymentProvider?.getRequiredSettings() ?? emailProvider?.getRequiredSettings() ?? [],
        installedAt: p.installedAt,
      };
    });
  }

  /** Activate/deactivate a plugin (legacy API — delegates to new methods) */
  async setPluginActive(pluginId: string, active: boolean): Promise<void> {
    if (active) {
      await this.activatePlugin(pluginId);
    } else {
      await this.deactivatePlugin(pluginId);
    }
  }

  /** Update plugin settings */
  async updatePluginSettings(
    pluginId: string,
    newSettings: Record<string, unknown>,
  ): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
      with: { settings: true },
    });

    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    for (const [key, value] of Object.entries(newSettings)) {
      const existing = plugin.settings.find((s) => s.key === key);
      if (existing) {
        await this.db
          .update(pluginSettings)
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

    // If plugin is active, re-initialize
    if (plugin.isActive) {
      await this.deactivatePlugin(pluginId);
      await this.activatePlugin(pluginId);
    }

    logger.info({ pluginId, keys: Object.keys(newSettings) }, 'Plugin settings updated');
  }
}
