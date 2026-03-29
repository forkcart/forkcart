import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { watch, type FSWatcher } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Database } from '@forkcart/database';
import { plugins, pluginSettings } from '@forkcart/database/schemas';
import type { PaymentProvider } from '../payments/provider';
import type { PaymentProviderRegistry } from '../payments/registry';
import type { EmailProvider } from '../email/provider';
import type { EmailProviderRegistry } from '../email/registry';
import type { MarketplaceProvider } from '../marketplace/types';
import type { MarketplaceProviderRegistry } from '../marketplace/registry';
import type { ShippingProvider, ShippingProviderRegistry } from '../shipping/registry';
import type { EventBus } from './event-bus';
import type { EventHandler } from './types';
import { createLogger } from '../lib/logger';
import { encryptSecret, decryptSecret, isEncrypted } from '../utils/crypto';
import { ScopedDatabase } from './scoped-database';
import { MigrationRunner } from './migration-runner';

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
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  minVersion?: string;
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
  onInstall?: (ctx: unknown) => void | Promise<void>;
  onUninstall?: (ctx: unknown) => void | Promise<void>;
  onUpdate?: (ctx: unknown, fromVersion: string) => void | Promise<void>;
  onError?: (
    error: Error,
    source: { type: string; name: string },
    ctx: unknown,
  ) => void | boolean | Promise<void | boolean>;
  onReady?: (ctx: unknown) => void | Promise<void>;
  hooks?: Record<string, (event: unknown, ctx: unknown) => void | Promise<void>>;
  filters?: Record<string, (data: unknown, ctx: unknown) => unknown | Promise<unknown>>;
  provider?: Record<string, unknown>;
  adminPages?: Array<{
    path: string;
    label: string;
    icon?: string;
    parent?: string;
    order?: number;
    content?: string;
    apiRoute?: string;
  }>;
  routes?: (router: unknown) => void;
  storefrontSlots?: Array<{ slot: string; content: string; order?: number; pages?: string[] }>;
  settingsGroups?: Array<{
    label: string;
    description?: string;
    keys: string[];
  }>;
  storefrontComponents?:
    | Array<{
        slot: string;
        name: string;
        props?: string[];
        pages?: string[];
        order?: number;
      }>
    | Record<string, string>;
  storefrontPages?: Array<{
    path: string;
    title: string;
    content?: string;
    contentRoute?: string;
    scripts?: string[];
    styles?: string;
    showInNav?: boolean;
    navLabel?: string;
    navIcon?: string;
    requireAuth?: boolean;
    metaDescription?: string;
    useExtPrefix?: boolean;
  }>;
  pageBuilderBlocks?: Array<{
    name: string;
    label: string;
    icon?: string;
    category?: string;
    description?: string;
    content: string;
    defaultSlot?: string;
    defaultOrder?: number;
    pages?: string[];
    settings?: Record<string, unknown>;
  }>;
  migrations?: Array<{
    version: string;
    description: string;
    up: (db: unknown) => Promise<void>;
    down?: (db: unknown) => Promise<void>;
  }>;
  cli?: Array<{
    name: string;
    description: string;
    args?: Array<{ name: string; description: string; required?: boolean }>;
    options?: Array<{
      name: string;
      alias?: string;
      description: string;
      type: string;
      default?: unknown;
    }>;
    handler: (args: Record<string, unknown>, ctx: unknown) => Promise<void>;
  }>;
  scheduledTasks?: Array<{
    name: string;
    schedule: string;
    handler: (ctx: unknown) => Promise<void>;
    enabled?: boolean;
  }>;
  dependencies?: string[];
  permissions?: string[];
}

/** Filter handler type */
type FilterHandler<T = unknown> = (data: T, ctx: unknown) => T | Promise<T>;

/** CLI Command type (extracted from SdkPluginDefinition) */
interface CliCommand {
  name: string;
  description: string;
  args?: Array<{ name: string; description: string; required?: boolean }>;
  options?: Array<{
    name: string;
    alias?: string;
    description: string;
    type: string;
    default?: unknown;
  }>;
  handler: (args: Record<string, unknown>, ctx: unknown) => Promise<void>;
}

/** Scheduled Task type (extracted from SdkPluginDefinition) */
interface ScheduledTask {
  name: string;
  schedule: string;
  handler: (ctx: unknown) => Promise<void>;
  enabled?: boolean;
}

/** Plugin permission type (mirrors @forkcart/plugin-sdk PluginPermission) */
export type PluginPermission =
  | 'orders:read'
  | 'orders:write'
  | 'products:read'
  | 'products:write'
  | 'customers:read'
  | 'customers:write'
  | 'settings:read'
  | 'settings:write'
  | 'email:send'
  | 'payments:process'
  | 'inventory:read'
  | 'inventory:write'
  | 'analytics:read'
  | 'files:read'
  | 'files:write'
  | 'webhooks:manage'
  | 'admin:full';

/** Track registered hook handlers per plugin so we can unregister them */
interface ActivePluginState {
  pluginName: string;
  registeredHooks: Map<string, EventHandler<unknown>>;
  registeredFilters: Map<string, FilterHandler>;
}

/**
 * Unified plugin loader — handles both legacy registerDefinition() plugins
 * and new SDK-style `definePlugin()` plugins discovered from data/plugins/.
 */
export class PluginLoader {
  private legacyPlugins = new Map<string, LegacyPluginDefinition>();
  private sdkPlugins = new Map<string, SdkPluginDefinition>();
  private pluginSettingsCache = new Map<string, Record<string, unknown>>();
  private activeStates = new Map<string, ActivePluginState>();

  // ─── Settings Schema Registry (for secret detection) ───────────────────────
  private pluginSchemas = new Map<
    string,
    Record<string, { type: string; secret?: boolean; [key: string]: unknown }>
  >();

  // ─── Filter Registry (like WordPress apply_filters) ────────────────────────
  private filterHandlers = new Map<string, Set<{ priority: number; handler: FilterHandler }>>();

  // ─── Storefront Slots Registry ─────────────────────────────────────────────
  private storefrontSlots = new Map<
    string,
    Array<{ pluginName: string; content: string; order: number; pages?: string[] }>
  >();

  // ─── Storefront Pages Registry ───────────────────────────────────────────────
  private storefrontPages = new Map<
    string,
    {
      pluginName: string;
      path: string;
      title: string;
      content?: string;
      contentRoute?: string;
      scripts?: string[];
      styles?: string;
      showInNav?: boolean;
      navLabel?: string;
      navIcon?: string;
      requireAuth?: boolean;
      metaDescription?: string;
      useExtPrefix?: boolean;
    }
  >();

  // ─── Storefront Components Registry (React components from plugins) ─────────
  private storefrontComponents = new Map<
    string,
    Array<{
      pluginName: string;
      name: string;
      slot: string;
      props?: string[];
      pages?: string[];
      order: number;
    }>
  >();

  // ─── CLI Commands Registry ─────────────────────────────────────────────────
  private cliCommands = new Map<string, { pluginName: string; command: CliCommand }>();

  // ─── Scheduled Tasks Registry ──────────────────────────────────────────────
  private scheduledTasks = new Map<string, { pluginName: string; task: ScheduledTask }>();

  // ─── Plugin Permissions Registry ──────────────────────────────────────────
  private pluginPermissions = new Map<string, Set<PluginPermission>>();

  /** Track the filesystem path each plugin was loaded from (for hot reload) */
  private pluginPaths = new Map<string, string>();

  // ─── Plugin Routes Registry ────────────────────────────────────────────────
  private pluginRouteRegistrars = new Map<string, (router: unknown) => void>();

  // ─── PageBuilder Blocks Registry ───────────────────────────────────────────
  private pageBuilderBlocks = new Map<
    string,
    Array<{
      pluginName: string;
      name: string;
      label: string;
      icon?: string;
      category: string;
      description?: string;
      content: string;
      defaultSlot?: string;
      defaultOrder: number;
      pages?: string[];
      settings?: Record<string, unknown>;
    }>
  >();

  // ─── Migration Runner ──────────────────────────────────────────────────────
  private migrationRunner: MigrationRunner;

  constructor(
    private readonly db: Database,
    private readonly paymentRegistry: PaymentProviderRegistry,
    private readonly emailRegistry?: EmailProviderRegistry,
    private readonly marketplaceRegistry?: MarketplaceProviderRegistry,
    private readonly shippingRegistry?: ShippingProviderRegistry,
    private readonly eventBus?: EventBus,
  ) {
    this.migrationRunner = new MigrationRunner(db);
  }

  // ─── Permission API ────────────────────────────────────────────────────────

  /** Register the permissions declared by a plugin */
  registerPluginPermissions(pluginName: string, permissions: PluginPermission[]): void {
    this.pluginPermissions.set(pluginName, new Set(permissions));
  }

  /** Check if a plugin has a specific permission (admin:full grants everything) */
  hasPermission(pluginName: string, permission: PluginPermission): boolean {
    const perms = this.pluginPermissions.get(pluginName);
    if (!perms) return false;
    return perms.has(permission) || perms.has('admin:full');
  }

  /** Throw if a plugin lacks a specific permission */
  requirePermission(pluginName: string, permission: PluginPermission): void {
    if (!this.hasPermission(pluginName, permission)) {
      throw new Error(`Plugin '${pluginName}' lacks permission '${permission}'`);
    }
  }

  /** Get the permissions registered for a plugin */
  getPluginPermissions(pluginName: string): PluginPermission[] {
    const perms = this.pluginPermissions.get(pluginName);
    return perms ? [...perms] : [];
  }

  // ─── Dependency Validation ─────────────────────────────────────────────────

  /**
   * Validate that all declared dependencies of a plugin are installed and active.
   * Throws if any dependency is missing or inactive.
   */
  /** Find SDK definition by scanning all registered plugins (slug/name match) */
  private findSdkDefByName(name: string): SdkPluginDefinition | undefined {
    const normalized = name.toLowerCase().replace(/\s+/g, '-');
    for (const [key, def] of this.sdkPlugins) {
      if (key === normalized || def.name === name || def.name === normalized) {
        return def;
      }
    }
    return undefined;
  }

  /** Find SDK definition by DB name or metadata slug */
  private findSdkDef(
    dbName: string,
    metadata?: Record<string, unknown> | null,
  ): SdkPluginDefinition | undefined {
    return (
      this.sdkPlugins.get(dbName) ??
      (metadata?.slug ? this.sdkPlugins.get(metadata.slug as string) : undefined)
    );
  }

  /** Simple semver comparison: returns true if a < b */
  private semverLt(a: string, b: string): boolean {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va < vb) return true;
      if (va > vb) return false;
    }
    return false;
  }

  private async validateDependencies(pluginName: string, dependencies: string[]): Promise<void> {
    const missing: string[] = [];
    const inactive: string[] = [];

    for (const dep of dependencies) {
      const depPlugin = await this.db.query.plugins.findFirst({
        where: eq(plugins.name, dep),
      });

      if (!depPlugin) {
        missing.push(dep);
      } else if (!depPlugin.isActive) {
        inactive.push(dep);
      }
    }

    if (missing.length > 0 || inactive.length > 0) {
      const errors: string[] = [];
      if (missing.length > 0) {
        errors.push(`Missing plugins: ${missing.join(', ')}`);
      }
      if (inactive.length > 0) {
        errors.push(`Inactive plugins: ${inactive.join(', ')}`);
      }
      throw new Error(
        `Cannot activate plugin '${pluginName}': unmet dependencies. ${errors.join('. ')}. ` +
          `Please install and activate the required plugins first.`,
      );
    }

    logger.debug({ pluginName, dependencies }, 'All dependencies satisfied');
  }

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

    // Store settings schema for secret detection
    if (def.settings) {
      this.pluginSchemas.set(def.name, def.settings);
    }

    // Register plugin permissions
    if (def.permissions && def.permissions.length > 0) {
      this.registerPluginPermissions(def.name, def.permissions as PluginPermission[]);
    }

    logger.debug({ pluginName: def.name }, 'SDK plugin definition registered');
  }

  // ─── Discovery ─────────────────────────────────────────────────────────────

  /**
   * Try to load a plugin from the installed plugins directory.
   * Plugins installed via the registry are stored in data/plugins/<plugin-name>/
   */
  private async tryLoadInstalledPlugin(
    pluginName: string,
    pluginMetadata?: Record<string, unknown> | null,
  ): Promise<SdkPluginDefinition | null> {
    // Use slug from DB metadata if available, otherwise normalize display name
    const slug = (pluginMetadata?.slug as string) ?? null;
    const dirName = pluginName.toLowerCase().replace(/\s+/g, '-');

    // Search paths in data/plugins/ — slug first (most reliable), then normalized name
    const dataPluginsDir = join(process.cwd(), 'data', 'plugins');

    const slugPaths = slug
      ? [
          join(dataPluginsDir, slug),
          join(dataPluginsDir, slug, `forkcart-plugin-${slug}`),
          join(dataPluginsDir, slug, slug), // ZIP wraps in same-name subfolder
        ]
      : [];

    const namePaths = [
      join(dataPluginsDir, dirName),
      join(dataPluginsDir, dirName, `forkcart-plugin-${dirName}`),
      join(dataPluginsDir, dirName, dirName), // ZIP wraps in same-name subfolder
      join(dataPluginsDir, pluginName),
    ];

    const possiblePaths = [...slugPaths, ...namePaths];

    for (const pluginPath of possiblePaths) {
      try {
        const def = await this.tryLoadPluginFromPath(pluginPath);
        if (def) {
          // Already registered in tryLoadPluginFromPath → loadPluginFromPath
          return def;
        }
      } catch {
        // Try next path
      }
    }

    return null;
  }

  /** Scan data/plugins/ for store-installed and local dev plugins */
  async discoverPlugins(): Promise<SdkPluginDefinition[]> {
    const discovered: SdkPluginDefinition[] = [];

    // Single source: data/plugins/
    const localPluginDirs = [resolve(process.cwd(), 'data', 'plugins')];

    for (const pluginsDir of localPluginDirs) {
      try {
        const entries = await readdir(pluginsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          // Check direct path: plugins/<slug>/
          let def = await this.tryLoadPluginFromPath(join(pluginsDir, entry.name));
          if (def) {
            discovered.push(def);
            continue;
          }

          // Check nested path: plugins/<slug>/forkcart-plugin-<slug>/
          // (common when ZIP contains a folder)
          const nestedPath = join(pluginsDir, entry.name, `forkcart-plugin-${entry.name}`);
          def = await this.tryLoadPluginFromPath(nestedPath);
          if (def) {
            discovered.push(def);
            continue;
          }

          // Check for same-name subfolder: plugins/<slug>/<slug>/
          // (common when ZIP wraps contents in a folder matching the slug)
          const sameNamePath = join(pluginsDir, entry.name, entry.name);
          def = await this.tryLoadPluginFromPath(sameNamePath);
          if (def) {
            discovered.push(def);
            continue;
          }

          // Check for any forkcart-plugin-* or other subfolder with package.json
          try {
            const subEntries = await readdir(join(pluginsDir, entry.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (
                sub.isDirectory() &&
                (sub.name.startsWith('forkcart-plugin-') || sub.name !== 'node_modules')
              ) {
                def = await this.tryLoadPluginFromPath(join(pluginsDir, entry.name, sub.name));
                if (def) {
                  discovered.push(def);
                  break;
                }
              }
            }
          } catch {
            // Subfolder doesn't exist or not readable
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
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
        !name?.startsWith('forkcart-plugin-') &&
        !name?.startsWith('@forkcart/plugin-')
      ) {
        logger.debug({ path: pkgPath, name, keywords }, 'Skipped: not a ForkCart plugin');
        return null;
      }

      // Already registered?
      if (this.sdkPlugins.has(name) || this.legacyPlugins.has(name)) {
        logger.debug({ path: pkgPath, name }, 'Skipped: already registered');
        return null;
      }

      // Try loading from file path directly (for local plugins)
      return await this.loadPluginFromPath(pkgPath, name);
    } catch (err) {
      logger.debug(
        { path: pkgPath, error: err instanceof Error ? err.message : err },
        'tryLoadPluginFromPath failed',
      );
      return null;
    }
  }

  /**
   * Load a plugin from a local file path (not npm).
   * This is used for plugins installed via the registry that are extracted to disk.
   */
  private async loadPluginFromPath(
    pkgPath: string,
    packageName: string,
  ): Promise<SdkPluginDefinition | null> {
    try {
      // Read package.json to find entry point
      const pkgJsonPath = join(pkgPath, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
      const main = (pkgJson['main'] as string) || 'dist/index.js';
      const entryPath = resolve(pkgPath, main);

      // Check if entry file exists
      try {
        readFileSync(entryPath);
      } catch {
        logger.warn({ packageName, entryPath }, 'Plugin entry point not found');
        return null;
      }

      // Import using file:// URL (works for local ES modules)
      // Cache-bust with timestamp query to force re-import on reload
      const fileUrl = `file://${entryPath}?t=${Date.now()}`;
      const mod = (await import(fileUrl)) as Record<string, unknown>;
      const def = (mod['default'] ?? mod) as SdkPluginDefinition;

      if (!def.name || !def.version || !def.type) {
        logger.warn(
          { packageName, path: pkgPath },
          'Invalid plugin definition — missing name/version/type',
        );
        return null;
      }

      // Try to read forkcart-plugin.json manifest for slug
      try {
        const manifestPath = join(pkgPath, 'forkcart-plugin.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
        if (manifest.slug) {
          (def as unknown as Record<string, unknown>)._manifestSlug = manifest.slug;
        }
      } catch {
        // No manifest — that's fine
      }

      this.registerSdkPlugin(def);
      this.pluginPaths.set(def.name, pkgPath);
      logger.info({ pluginName: def.name, path: pkgPath }, 'Plugin loaded from local path');
      return def;
    } catch (error) {
      logger.error({ packageName, path: pkgPath, error }, 'Failed to load plugin from path');
      return null;
    }
  }

  // ─── Install / Uninstall ──────────────────────────────────────────────────

  /**
   * Install a plugin.
   * Actual ZIP download + extraction is handled by the plugin-store API route.
   * This method loads an already-extracted plugin from data/plugins/.
   */
  async installPlugin(pluginName: string): Promise<SdkPluginDefinition | null> {
    logger.info({ pluginName }, 'Loading installed plugin from data/plugins/');
    return this.tryLoadInstalledPlugin(pluginName);
  }

  /** Uninstall a plugin — deactivate, remove from DB, delete from disk */
  async uninstallPlugin(pluginName: string): Promise<void> {
    logger.info({ pluginName }, 'Uninstalling plugin');

    // Deactivate first if active
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, pluginName),
    });
    if (plugin?.isActive) {
      await this.deactivatePlugin(plugin.id);
    }

    this.sdkPlugins.delete(pluginName);

    // Remove from DB
    await this.db.delete(plugins).where(eq(plugins.name, pluginName));

    // Delete plugin directory from disk
    const dirName = pluginName.toLowerCase().replace(/\s+/g, '-');
    const slug = (plugin?.metadata as Record<string, unknown> | null)?.slug as string | undefined;
    const pluginsDir = resolve(process.cwd(), 'data', 'plugins');

    // Try slug-based dir first, then name-based
    for (const dir of [slug, dirName].filter(Boolean)) {
      const dirPath = join(pluginsDir, dir!);
      try {
        await rm(dirPath, { recursive: true, force: true });
        logger.info({ pluginName, dirPath }, 'Deleted plugin directory');
        break;
      } catch {
        // Directory may not exist at this path
      }
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
        // Version changed — trigger update handling
        await this.handlePluginUpdate(def.name, existing.version, def.version);
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

    // Use manifest slug if available, otherwise derive from plugin name
    const pluginSlug =
      ((def as unknown as Record<string, unknown>)._manifestSlug as string) ??
      def.name.toLowerCase().replace(/\s+/g, '-');

    const [plugin] = await this.db
      .insert(plugins)
      .values({
        name: def.name,
        version: def.version,
        description: def.description,
        author: def.author,
        isActive: false,
        entryPoint: type,
        metadata: { type, slug: pluginSlug },
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

    // Validate dependencies before activation
    const sdkDef = this.findSdkDef(plugin.name, plugin.metadata as Record<string, unknown> | null);
    if (sdkDef?.dependencies && sdkDef.dependencies.length > 0) {
      await this.validateDependencies(plugin.name, sdkDef.dependencies);
    }

    // Check ForkCart version compatibility
    if (sdkDef?.minVersion) {
      const currentVersion = process.env.FORKCART_VERSION || '0.1.0';
      if (this.semverLt(currentVersion, sdkDef.minVersion)) {
        throw new Error(
          `Plugin '${plugin.name}' requires ForkCart ${sdkDef.minVersion}+, but current version is ${currentVersion}`,
        );
      }
    }

    const rawSettings: Record<string, unknown> = {};
    for (const s of plugin.settings) {
      rawSettings[s.key] = s.value;
    }

    // Validate required settings
    if (sdkDef?.settings) {
      const missing: string[] = [];
      for (const [key, schema] of Object.entries(sdkDef.settings)) {
        const s = schema as { required?: boolean; label?: string };
        if (s.required && (rawSettings[key] === undefined || rawSettings[key] === '')) {
          missing.push(s.label || key);
        }
      }
      if (missing.length > 0) {
        throw new Error(
          `Cannot activate '${plugin.name}': missing required settings: ${missing.join(', ')}`,
        );
      }
    }

    // Decrypt secret settings before passing to the plugin
    const settings = this.decryptSettings(plugin.name, rawSettings);

    // Try SDK plugin first, then try loading from data/plugins/
    if (sdkDef) {
      await this.activateSdkPlugin(plugin.name, sdkDef, settings);
    } else {
      // Plugin not in memory — try loading from data/plugins/
      const loadedDef = await this.tryLoadInstalledPlugin(
        plugin.name,
        plugin.metadata as Record<string, unknown> | null,
      );
      if (loadedDef) {
        await this.activateSdkPlugin(plugin.name, loadedDef, settings);
      } else {
        throw new Error(
          `Cannot activate '${plugin.name}': plugin code not found in data/plugins/. Install it from the Plugin Store first.`,
        );
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

    const rawSettings: Record<string, unknown> = {};
    const pluginSettingsRows = await this.db.query.pluginSettings.findMany({
      where: eq(pluginSettings.pluginId, pluginId),
    });
    for (const s of pluginSettingsRows) {
      rawSettings[s.key] = s.value;
    }

    // Decrypt secret settings for onDeactivate callback
    const settings = this.decryptSettings(plugin.name, rawSettings);

    // Call onDeactivate for SDK plugins
    const sdkDef = this.findSdkDef(plugin.name, plugin.metadata as Record<string, unknown> | null);
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

    // Unregister filters
    if (state?.registeredFilters) {
      for (const [filterName, handler] of state.registeredFilters) {
        const handlers = this.filterHandlers.get(filterName);
        if (handlers) {
          for (const h of handlers) {
            if (h.handler === handler) {
              handlers.delete(h);
              break;
            }
          }
          if (handlers.size === 0) {
            this.filterHandlers.delete(filterName);
          }
        }
      }
    }

    // Unregister storefront slots
    for (const [slotName, slots] of this.storefrontSlots) {
      const filtered = slots.filter((s) => s.pluginName !== plugin.name);
      if (filtered.length === 0) {
        this.storefrontSlots.delete(slotName);
      } else {
        this.storefrontSlots.set(slotName, filtered);
      }
    }

    // Unregister storefront components
    for (const [slotName, comps] of this.storefrontComponents) {
      const filtered = comps.filter((c) => c.pluginName !== plugin.name);
      if (filtered.length === 0) {
        this.storefrontComponents.delete(slotName);
      } else {
        this.storefrontComponents.set(slotName, filtered);
      }
    }

    // Unregister storefront pages
    for (const [path, page] of this.storefrontPages) {
      if (page.pluginName === plugin.name) {
        this.storefrontPages.delete(path);
      }
    }

    // Unregister pageBuilderBlocks
    for (const [key] of this.pageBuilderBlocks) {
      if (key.startsWith(`${plugin.name}:`)) {
        this.pageBuilderBlocks.delete(key);
      }
    }

    // Unregister CLI commands
    for (const [key, entry] of this.cliCommands) {
      if (entry.pluginName === plugin.name) {
        this.cliCommands.delete(key);
      }
    }

    // Unregister scheduled tasks
    for (const [key, entry] of this.scheduledTasks) {
      if (entry.pluginName === plugin.name) {
        this.scheduledTasks.delete(key);
      }
    }

    // Unregister custom routes
    this.pluginRouteRegistrars.delete(plugin.name);

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

  async activateSdkPlugin(
    pluginName: string,
    def: SdkPluginDefinition,
    settings: Record<string, unknown>,
  ): Promise<void> {
    const ctx = this.buildPluginContext(pluginName, settings);
    const hookHandlers = new Map<string, EventHandler<unknown>>();
    const filterHandlers = new Map<string, FilterHandler>();

    // Register hooks
    if (def.hooks && this.eventBus) {
      for (const [eventType, handler] of Object.entries(def.hooks)) {
        if (!handler) continue;
        const wrappedHandler: EventHandler<unknown> = async (event) => {
          try {
            await handler(event, ctx);
          } catch (error) {
            logger.error({ pluginName, eventType, error }, 'Plugin hook handler failed');
            // Call plugin's onError handler if defined
            if (def.onError && error instanceof Error) {
              try {
                await def.onError(error, { type: 'hook', name: eventType }, ctx);
              } catch {
                /* onError itself failed — swallow */
              }
            }
          }
        };
        this.eventBus.on(eventType, wrappedHandler);
        hookHandlers.set(eventType, wrappedHandler);
      }
    }

    // Register filters (like WordPress apply_filters)
    if (def.filters) {
      for (const [filterName, handler] of Object.entries(def.filters)) {
        if (!handler) continue;
        const wrappedHandler: FilterHandler = async (data) => {
          try {
            return await handler(data, ctx);
          } catch (error) {
            logger.error({ pluginName, filterName, error }, 'Plugin filter handler failed');
            return data; // Return unmodified data on error
          }
        };
        this.registerFilter(filterName, wrappedHandler);
        filterHandlers.set(filterName, wrappedHandler);
      }
    }

    // Register storefront slots
    if (def.storefrontSlots) {
      for (const slot of def.storefrontSlots) {
        const existing = this.storefrontSlots.get(slot.slot) ?? [];
        existing.push({
          pluginName,
          content: slot.content,
          order: slot.order ?? 10,
          pages: slot.pages,
        });
        existing.sort((a, b) => a.order - b.order);
        this.storefrontSlots.set(slot.slot, existing);
      }
    }

    // Register storefront components (React components)
    if (def.storefrontComponents) {
      // Support both array format [{slot, name, ...}] and object format {Name: './path'}
      const comps = Array.isArray(def.storefrontComponents)
        ? def.storefrontComponents
        : Object.entries(def.storefrontComponents as Record<string, string>).map(
            ([name, path]) => ({
              slot: 'plugin-component',
              name,
              props: [] as string[],
              pages: [] as string[],
              order: 10,
              path,
            }),
          );
      for (const comp of comps) {
        const existing = this.storefrontComponents.get(comp.slot) ?? [];
        existing.push({
          pluginName,
          name: comp.name,
          slot: comp.slot,
          props: comp.props,
          pages: comp.pages,
          order: comp.order ?? 10,
        });
        existing.sort((a, b) => a.order - b.order);
        this.storefrontComponents.set(comp.slot, existing);
      }
    }

    // Register storefront pages
    if (def.storefrontPages) {
      for (const page of def.storefrontPages) {
        const normalizedPath = page.path.startsWith('/') ? page.path : `/${page.path}`;
        this.storefrontPages.set(normalizedPath, {
          pluginName,
          path: normalizedPath,
          title: page.title,
          content: page.content,
          contentRoute: page.contentRoute,
          scripts: page.scripts,
          styles: page.styles,
          showInNav: page.showInNav,
          navLabel: page.navLabel,
          navIcon: page.navIcon,
          requireAuth: page.requireAuth,
          metaDescription: page.metaDescription,
          useExtPrefix: page.useExtPrefix,
        });
        logger.debug({ pluginName, path: normalizedPath }, 'Storefront page registered');
      }
    }

    // Register pageBuilderBlocks
    if (def.pageBuilderBlocks) {
      for (const block of def.pageBuilderBlocks) {
        const key = `${pluginName}:${block.name}`;
        const entry = {
          pluginName,
          name: block.name,
          label: block.label,
          icon: block.icon,
          category: block.category ?? 'Plugins',
          description: block.description,
          content: block.content,
          defaultSlot: block.defaultSlot,
          defaultOrder: block.defaultOrder ?? 10,
          pages: block.pages,
          settings: block.settings,
        };
        this.pageBuilderBlocks.set(key, [...(this.pageBuilderBlocks.get(key) ?? []), entry]);
        logger.debug({ pluginName, block: block.name }, 'PageBuilder block registered');
      }
    }

    // Register CLI commands
    if (def.cli) {
      for (const command of def.cli) {
        const key = `${pluginName}:${command.name}`;
        this.cliCommands.set(key, { pluginName, command });
        logger.debug({ pluginName, command: command.name }, 'CLI command registered');
      }
    }

    // Register scheduled tasks
    if (def.scheduledTasks) {
      for (const task of def.scheduledTasks) {
        const key = `${pluginName}:${task.name}`;
        this.scheduledTasks.set(key, { pluginName, task });
        logger.debug(
          { pluginName, task: task.name, schedule: task.schedule },
          'Scheduled task registered',
        );
      }
    }

    // Register custom routes
    if (def.routes) {
      this.pluginRouteRegistrars.set(pluginName, def.routes);
      logger.debug({ pluginName }, 'Plugin routes registered');
    }

    this.activeStates.set(pluginName, {
      pluginName,
      registeredHooks: hookHandlers,
      registeredFilters: filterHandlers,
    });

    // Run pending migrations before activation
    // Note: Pass ctx.db (the ScopedDatabase), not the full ctx
    // because migration.up(db) expects a database handle, not the full context
    if (def.migrations && def.migrations.length > 0) {
      const ctxWithDb = ctx as { db: unknown };
      await this.migrationRunner.runPendingMigrations(pluginName, def.migrations, ctxWithDb.db);
    }

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
      await paymentBridge.initialize(settings);
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

    // Shipping provider bridge
    if (
      def.type === 'shipping' &&
      'getRates' in provider &&
      typeof provider['getRates'] === 'function' &&
      this.shippingRegistry
    ) {
      const shippingBridge = this.createShippingProviderBridge(def.name, provider, settings);
      this.shippingRegistry.register(shippingBridge);
    }
  }

  private createPaymentProviderBridge(
    name: string,
    provider: Record<string, unknown>,
    _settings: Record<string, unknown>,
  ): PaymentProvider {
    const p = provider as Record<string, (...args: unknown[]) => unknown>;
    // Use the provider's own ID from getClientConfig if available, otherwise plugin name
    const clientConfig =
      typeof p['getClientConfig'] === 'function'
        ? (p['getClientConfig']() as Record<string, unknown>)
        : null;
    const providerId = (clientConfig?.['provider'] as string) ?? name;
    const displayName = (clientConfig?.['displayName'] as string) ?? name;
    return {
      id: providerId,
      displayName,
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

  private createShippingProviderBridge(
    name: string,
    provider: Record<string, unknown>,
    _settings: Record<string, unknown>,
  ): ShippingProvider {
    const p = provider as Record<string, (...args: unknown[]) => unknown>;
    return {
      id: name,
      displayName: name,
      async initialize(s: Record<string, unknown>) {
        if (typeof p['initialize'] === 'function') await p['initialize'](s);
      },
      isConfigured: () => true,
      getRates: (from: unknown, to: unknown, parcels: unknown) =>
        p['getRates']!(from, to, parcels) as ReturnType<ShippingProvider['getRates']>,
      createShipment: (from: unknown, to: unknown, parcels: unknown, rateId: string) =>
        p['createShipment']!(from, to, parcels, rateId) as ReturnType<
          ShippingProvider['createShipment']
        >,
      getTracking: (trackingNumber: string) =>
        p['getTracking']!(trackingNumber) as ReturnType<ShippingProvider['getTracking']>,
    } satisfies ShippingProvider;
  }

  // ─── Plugin context builder ───────────────────────────────────────────────

  /**
   * Build the context object passed to plugin lifecycle hooks.
   *
   * Security: Plugins receive a ScopedDatabase proxy instead of the raw db handle.
   * The proxy enforces permission-based access control:
   * - Plugin-owned tables (plugin_<name>_*) are always accessible
   * - Core tables require matching permissions (e.g., 'orders:read' for orders table)
   * - 'admin:full' grants unrestricted access
   */
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

    // Build scoped database with permission-based access control
    const permissions = this.pluginPermissions.get(pluginName) ?? new Set<PluginPermission>();
    const scopedDb = new ScopedDatabase(this.db, pluginName, permissions);

    return {
      settings,
      db: scopedDb,
      logger: pluginLogger,
      eventBus: this.eventBus ?? {
        on: () => {},
        off: () => {},
        emit: async () => {},
      },
    };
  }

  /**
   * Get plugin context for use in route handlers.
   * Returns the same context object that plugins receive in their lifecycle hooks.
   * Accepts either the plugin's internal name (e.g., "fomo-badges") or display name (e.g., "FOMO Badges")
   */
  getPluginContext(pluginName: string): unknown | null {
    // Try direct lookup first
    let def = this.sdkPlugins.get(pluginName);

    // If not found, search by slug-like matching
    if (!def) {
      const normalizedSearch = pluginName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [name, plugin] of this.sdkPlugins.entries()) {
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedName === normalizedSearch) {
          def = plugin;
          break;
        }
      }
    }

    if (!def) return null;

    // Use cached settings from loadActivePlugins (includes DB values + decrypted secrets)
    // Fall back to defaults if not cached (e.g., plugin loaded dynamically)
    const cachedSettings = this.pluginSettingsCache.get(def.name);
    const settings: Record<string, unknown> = cachedSettings ?? {};
    if (!cachedSettings && def.settings) {
      for (const [key, config] of Object.entries(def.settings)) {
        settings[key] = (config as { default?: unknown }).default;
      }
    }

    return this.buildPluginContext(def.name, settings);
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
      const rawSettings: Record<string, unknown> = {};
      for (const s of plugin.settings) {
        rawSettings[s.key] = s.value;
      }

      // Decrypt secret settings before passing to plugins
      const settings = this.decryptSettings(plugin.name, rawSettings);

      // Cache settings for getPluginContext() (used by plugin routes)
      this.pluginSettingsCache.set(plugin.name, settings);

      const sdkDef = this.findSdkDef(
        plugin.name,
        plugin.metadata as Record<string, unknown> | null,
      );
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

      // Try to load from installed plugins directory (for plugins installed via registry)
      const loadedDef = await this.tryLoadInstalledPlugin(
        plugin.name,
        plugin.metadata as Record<string, unknown> | null,
      );
      if (loadedDef) {
        await this.activateSdkPlugin(plugin.name, loadedDef, settings);
        logger.info({ pluginName: plugin.name }, 'Plugin loaded from installed directory');
        continue;
      }

      logger.warn({ pluginName: plugin.name }, 'Active plugin has no registered definition');
    }

    // Call onReady for all active SDK plugins
    for (const plugin of activePlugins) {
      const sdkDef = this.findSdkDef(
        plugin.name,
        plugin.metadata as Record<string, unknown> | null,
      );
      if (sdkDef?.onReady) {
        const rawSettings: Record<string, unknown> = {};
        for (const s of plugin.settings) {
          rawSettings[s.key] = s.value;
        }
        const settings = this.decryptSettings(plugin.name, rawSettings);
        try {
          await sdkDef.onReady(this.buildPluginContext(plugin.name, settings));
          logger.info({ pluginName: plugin.name }, 'Plugin onReady completed');
        } catch (error) {
          logger.error({ pluginName: plugin.name, error }, 'Plugin onReady failed');
        }
      }
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

  // ─── Filter API (like WordPress apply_filters) ────────────────────────────

  /** Register a filter handler */
  private registerFilter(filterName: string, handler: FilterHandler, priority = 10): void {
    const existing = this.filterHandlers.get(filterName) ?? new Set();
    existing.add({ priority, handler });
    this.filterHandlers.set(filterName, existing);
  }

  /** Apply all registered filters to data (like WordPress apply_filters) */
  async applyFilters<T>(filterName: string, data: T, ctx?: unknown): Promise<T> {
    const handlers = this.filterHandlers.get(filterName);
    if (!handlers || handlers.size === 0) return data;

    // Sort by priority and apply in order
    const sorted = [...handlers].sort((a, b) => a.priority - b.priority);
    let result = data;

    for (const { handler } of sorted) {
      try {
        result = (await handler(result, ctx)) as T;
      } catch (error) {
        logger.error({ filterName, error }, 'Filter handler failed');
      }
    }

    return result;
  }

  // ─── Storefront Slots API ─────────────────────────────────────────────────

  /** Get content for a storefront slot */
  getStorefrontSlotContent(
    slotName: string,
    currentPage?: string,
  ): Array<{ content: string; pluginName: string }> {
    const slots = this.storefrontSlots.get(slotName) ?? [];
    return slots
      .filter(
        (s) => !s.pages || s.pages.length === 0 || (currentPage && s.pages.includes(currentPage)),
      )
      .map((s) => ({ content: s.content, pluginName: s.pluginName }));
  }

  /** Get all registered storefront slots (for debugging/admin) */
  getAllStorefrontSlots(): Map<
    string,
    Array<{ pluginName: string; content: string; order: number }>
  > {
    return this.storefrontSlots;
  }

  // ─── Storefront Components API (React components from plugins) ──────────────

  /** Get React components registered for a specific storefront slot */
  getStorefrontComponents(
    slotName: string,
    currentPage?: string,
  ): Array<{
    pluginName: string;
    name: string;
    slot: string;
    props?: string[];
    order: number;
  }> {
    const comps = this.storefrontComponents.get(slotName) ?? [];
    return comps
      .filter(
        (c) => !c.pages || c.pages.length === 0 || (currentPage && c.pages.includes(currentPage)),
      )
      .map((c) => ({
        pluginName: c.pluginName,
        name: c.name,
        slot: c.slot,
        props: c.props,
        order: c.order,
      }));
  }

  /** Get all registered storefront components across all slots */
  getAllStorefrontComponents(): Array<{
    pluginName: string;
    name: string;
    slot: string;
    props?: string[];
    pages?: string[];
    order: number;
  }> {
    const result: Array<{
      pluginName: string;
      name: string;
      slot: string;
      props?: string[];
      pages?: string[];
      order: number;
    }> = [];
    for (const comps of this.storefrontComponents.values()) {
      result.push(...comps);
    }
    return result;
  }

  // ─── Storefront Pages API ───────────────────────────────────────────────────

  /** Get all registered storefront pages */
  getStorefrontPages(): Array<{
    pluginName: string;
    path: string;
    title: string;
    showInNav?: boolean;
    navLabel?: string;
    navIcon?: string;
    requireAuth?: boolean;
    metaDescription?: string;
    useExtPrefix?: boolean;
  }> {
    return [...this.storefrontPages.values()].map((p) => ({
      pluginName: p.pluginName,
      path: p.path,
      title: p.title,
      showInNav: p.showInNav,
      navLabel: p.navLabel,
      navIcon: p.navIcon,
      requireAuth: p.requireAuth,
      metaDescription: p.metaDescription,
      useExtPrefix: p.useExtPrefix,
    }));
  }

  /** Get a specific storefront page by path */
  getStorefrontPage(path: string): {
    pluginName: string;
    path: string;
    title: string;
    content?: string;
    contentRoute?: string;
    scripts?: string[];
    styles?: string;
    showInNav?: boolean;
    navLabel?: string;
    navIcon?: string;
    requireAuth?: boolean;
    metaDescription?: string;
    useExtPrefix?: boolean;
  } | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Exact match first
    const exact = this.storefrontPages.get(normalizedPath);
    if (exact) return exact;

    // Wildcard match: find pages with '*' patterns (e.g. '/blog/*' matches '/blog/my-post')
    for (const [pattern, page] of this.storefrontPages) {
      if (pattern.includes('*')) {
        const prefix = pattern.replace(/\/?\*$/, '');
        if (normalizedPath.startsWith(prefix + '/') || normalizedPath === prefix) {
          return page;
        }
      }
    }

    return null;
  }

  // ─── PageBuilder Blocks API ─────────────────────────────────────────────────

  /** Get all registered pageBuilderBlocks (for the admin PageBuilder UI block picker) */
  getAllPageBuilderBlocks(): Array<{
    pluginName: string;
    name: string;
    label: string;
    icon?: string;
    category: string;
    description?: string;
    content: string;
    defaultSlot?: string;
    defaultOrder: number;
    pages?: string[];
    settings?: Record<string, unknown>;
  }> {
    const result: Array<{
      pluginName: string;
      name: string;
      label: string;
      icon?: string;
      category: string;
      description?: string;
      content: string;
      defaultSlot?: string;
      defaultOrder: number;
      pages?: string[];
      settings?: Record<string, unknown>;
    }> = [];
    for (const entries of this.pageBuilderBlocks.values()) {
      result.push(...entries);
    }
    return result;
  }

  /**
   * Get pageBuilderBlocks that should render as fallbacks.
   * Returns blocks NOT placed in the current page's PageBuilder template,
   * filtered by page pattern and sorted by defaultOrder.
   *
   * @param placedBlockKeys - Array of "pluginName:blockName" keys already placed in the template
   * @param currentPage - Current page path for page filtering (e.g., '/product/xyz')
   */
  getPageBuilderBlockFallbacks(
    placedBlockKeys: string[],
    currentPage?: string,
  ): Array<{
    pluginName: string;
    name: string;
    label: string;
    content: string;
    defaultSlot: string;
    defaultOrder: number;
  }> {
    const placedSet = new Set(placedBlockKeys);
    const result: Array<{
      pluginName: string;
      name: string;
      label: string;
      content: string;
      defaultSlot: string;
      defaultOrder: number;
    }> = [];

    for (const entries of this.pageBuilderBlocks.values()) {
      for (const block of entries) {
        // Must have a defaultSlot to be a fallback candidate
        if (!block.defaultSlot) continue;

        // Skip blocks already placed in the template
        const key = `${block.pluginName}:${block.name}`;
        if (placedSet.has(key)) continue;

        // Check page filter
        if (block.pages && block.pages.length > 0 && currentPage) {
          const matches = block.pages.some((pattern) => {
            if (pattern.endsWith('/*')) {
              const prefix = pattern.slice(0, -1); // '/product/' from '/product/*'
              return currentPage.startsWith(prefix);
            }
            return currentPage === pattern;
          });
          if (!matches) continue;
        }

        result.push({
          pluginName: block.pluginName,
          name: block.name,
          label: block.label,
          content: block.content,
          defaultSlot: block.defaultSlot,
          defaultOrder: block.defaultOrder,
        });
      }
    }

    return result.sort((a, b) => a.defaultOrder - b.defaultOrder);
  }

  // ─── CLI Commands API ─────────────────────────────────────────────────────

  /** Get all registered CLI commands */
  getAllCliCommands(): Array<{ key: string; pluginName: string; command: CliCommand }> {
    return [...this.cliCommands.entries()].map(([key, val]) => ({ key, ...val }));
  }

  /** Execute a CLI command */
  async executeCliCommand(commandKey: string, args: Record<string, unknown>): Promise<void> {
    const entry = this.cliCommands.get(commandKey);
    if (!entry) throw new Error(`CLI command not found: ${commandKey}`);

    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, entry.pluginName),
      with: { settings: true },
    });

    const rawSettings: Record<string, unknown> = {};
    for (const s of plugin?.settings ?? []) {
      rawSettings[s.key] = s.value;
    }
    const settings = this.decryptSettings(entry.pluginName, rawSettings);

    const ctx = this.buildPluginContext(entry.pluginName, settings);
    await entry.command.handler(args, ctx);
  }

  // ─── Scheduled Tasks API ──────────────────────────────────────────────────

  /** Get all registered scheduled tasks */
  getAllScheduledTasks(): Array<{ key: string; pluginName: string; task: ScheduledTask }> {
    return [...this.scheduledTasks.entries()].map(([key, val]) => ({ key, ...val }));
  }

  /** Run a scheduled task */
  async runScheduledTask(taskKey: string): Promise<void> {
    const entry = this.scheduledTasks.get(taskKey);
    if (!entry) throw new Error(`Scheduled task not found: ${taskKey}`);

    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, entry.pluginName),
      with: { settings: true },
    });

    const rawSettings: Record<string, unknown> = {};
    for (const s of plugin?.settings ?? []) {
      rawSettings[s.key] = s.value;
    }
    const settings = this.decryptSettings(entry.pluginName, rawSettings);

    const ctx = this.buildPluginContext(entry.pluginName, settings);
    logger.info({ taskKey, pluginName: entry.pluginName }, 'Running scheduled task');
    await entry.task.handler(ctx);
  }

  // ─── Secret encryption helpers ──────────────────────────────────────────────

  /** Check if a setting key is marked as secret in the plugin's schema */
  private isSecretSetting(pluginName: string, key: string): boolean {
    const schema = this.pluginSchemas.get(pluginName);
    return schema?.[key]?.secret === true;
  }

  /** Encrypt a setting value if the key is marked as secret */
  private encryptSettingValue(pluginName: string, key: string, value: unknown): unknown {
    if (!this.isSecretSetting(pluginName, key)) return value;
    if (typeof value !== 'string') return value;
    if (isEncrypted(value)) return value; // Already encrypted
    return encryptSecret(value);
  }

  /** Decrypt a setting value if the key is marked as secret */
  private decryptSettingValue(pluginName: string, key: string, value: unknown): unknown {
    if (!this.isSecretSetting(pluginName, key)) return value;
    if (typeof value !== 'string') return value;
    if (!isEncrypted(value)) return value; // Not encrypted (legacy)
    return decryptSecret(value);
  }

  /** Decrypt all secret settings for a plugin */
  private decryptSettings(
    pluginName: string,
    settings: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      result[key] = this.decryptSettingValue(pluginName, key, value);
    }
    return result;
  }

  // ─── Admin API helpers ────────────────────────────────────────────────────

  /** Get all plugins (for admin API) */
  async getAllPlugins() {
    const allPlugins = await this.db.query.plugins.findMany({
      with: { settings: true },
    });

    return allPlugins.map((p) => {
      const legacyDef = this.legacyPlugins.get(p.name);
      // Try by DB name first, then by slug from metadata (store-installed plugins
      // have display name in DB but technical name in sdkPlugins)
      const slug = (p.metadata as Record<string, unknown> | null)?.slug as string | undefined;
      const sdkDef = this.sdkPlugins.get(p.name) ?? (slug ? this.sdkPlugins.get(slug) : undefined);
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
        source: sdkDef ? 'store' : legacyDef ? 'local' : 'unknown',
        settings: p.settings.map((s) => ({
          key: s.key,
          value: this.isSecretSetting(p.name, s.key) ? (s.value ? '••••••••' : null) : s.value,
        })),
        settingsSchema,
        settingsGroups: sdkDef?.settingsGroups ?? [],
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

  // ─── Plugin Routes API ─────────────────────────────────────────────────────

  /** Get all registered plugin route registrars (for mounting in the API app) */
  getPluginRouteRegistrars(): Map<string, (router: unknown) => void> {
    return this.pluginRouteRegistrars;
  }

  // ─── Plugin Health Check API ──────────────────────────────────────────────

  /** Run health checks on all active plugins */
  async healthCheck(): Promise<Array<{ pluginName: string; healthy: boolean; message?: string }>> {
    const results: Array<{ pluginName: string; healthy: boolean; message?: string }> = [];

    for (const [pluginName, state] of this.activeStates) {
      const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
      if (!sdkDef) {
        results.push({ pluginName, healthy: true, message: 'Legacy plugin (no health check)' });
        continue;
      }

      try {
        // Check if hooks are registered
        const hookCount = state.registeredHooks.size;
        const filterCount = state.registeredFilters.size;
        results.push({
          pluginName,
          healthy: true,
          message: `Active (${hookCount} hooks, ${filterCount} filters)`,
        });
      } catch (error) {
        results.push({
          pluginName,
          healthy: false,
          message: error instanceof Error ? error.message : 'Health check failed',
        });
      }
    }

    return results;
  }

  /** Detailed health check for a single plugin */
  async getPluginHealth(pluginId: string): Promise<PluginHealthReport> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.id, pluginId),
      with: { settings: true },
    });

    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    const sdkDef = this.findSdkDef(plugin.name, plugin.metadata as Record<string, unknown> | null);
    const state = this.activeStates.get(plugin.name);

    // Migration status
    let migrationStatus: PluginHealthReport['migrations'] = {
      status: 'applied',
      total: 0,
      applied: 0,
      pending: 0,
      failed: false,
    };
    if (sdkDef?.migrations && sdkDef.migrations.length > 0) {
      try {
        const applied = await this.migrationRunner.getAppliedMigrations(plugin.name);
        const appliedSet = new Set(applied);
        const pending = sdkDef.migrations.filter((m) => !appliedSet.has(m.version));
        migrationStatus = {
          status: pending.length > 0 ? 'pending' : 'applied',
          total: sdkDef.migrations.length,
          applied: applied.length,
          pending: pending.length,
          failed: false,
        };
      } catch {
        migrationStatus = {
          status: 'failed',
          total: sdkDef.migrations.length,
          applied: 0,
          pending: 0,
          failed: true,
        };
      }
    }

    // Settings validation
    const settingsIssues: string[] = [];
    if (sdkDef?.settings) {
      for (const [key, schema] of Object.entries(sdkDef.settings)) {
        if (!schema.required) continue;
        const setting = plugin.settings.find((s) => s.key === key);
        if (!setting || setting.value === null || setting.value === undefined) {
          settingsIssues.push(`Required setting '${key}' is not set`);
        }
      }
    }

    // Route registration
    const hasRoutes = this.pluginRouteRegistrars.has(plugin.name);

    // Dependency check
    const depIssues: string[] = [];
    if (sdkDef?.dependencies) {
      for (const dep of sdkDef.dependencies) {
        const depPlugin = await this.db.query.plugins.findFirst({
          where: eq(plugins.name, dep),
        });
        if (!depPlugin) {
          depIssues.push(`Missing dependency: ${dep}`);
        } else if (!depPlugin.isActive) {
          depIssues.push(`Inactive dependency: ${dep}`);
        }
      }
    }

    // Last error — check DB for any stored error (simplified: we report issues found)
    const issues = [...settingsIssues, ...depIssues];
    const healthy =
      migrationStatus.status !== 'failed' && settingsIssues.length === 0 && depIssues.length === 0;

    return {
      pluginId: plugin.id,
      pluginName: plugin.name,
      healthy,
      isActive: plugin.isActive,
      migrations: migrationStatus,
      settings: {
        valid: settingsIssues.length === 0,
        issues: settingsIssues,
      },
      routes: {
        registered: hasRoutes,
        hasDefinition: !!sdkDef?.routes,
      },
      dependencies: {
        satisfied: depIssues.length === 0,
        issues: depIssues,
      },
      hooks: state ? state.registeredHooks.size : 0,
      filters: state ? state.registeredFilters.size : 0,
      lastError: issues.length > 0 ? (issues[0] ?? null) : null,
    };
  }

  // ─── Conflict Detection ───────────────────────────────────────────────────

  /** Detect conflicts between active plugins */
  detectConflicts(): PluginConflict[] {
    const conflicts: PluginConflict[] = [];

    // 1. Route path conflicts
    const routePaths = new Map<string, string[]>();
    for (const [pluginName] of this.pluginRouteRegistrars) {
      const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
      if (!sdkDef?.routes) continue;
      // Extract route paths by running the registrar against a fake router
      const paths: string[] = [];
      const fakeRouter = {
        get: (path: string) => paths.push(`GET ${path}`),
        post: (path: string) => paths.push(`POST ${path}`),
        put: (path: string) => paths.push(`PUT ${path}`),
        delete: (path: string) => paths.push(`DELETE ${path}`),
        patch: (path: string) => paths.push(`PATCH ${path}`),
      };
      try {
        sdkDef.routes(fakeRouter);
      } catch {
        // Plugin route registration failed — skip
      }
      for (const p of paths) {
        const existing = routePaths.get(p) ?? [];
        existing.push(pluginName);
        routePaths.set(p, existing);
      }
    }
    for (const [path, pluginNames] of routePaths) {
      if (pluginNames.length > 1) {
        conflicts.push({
          type: 'route',
          plugins: pluginNames,
          detail: `Multiple plugins register route: ${path}`,
        });
      }
    }

    // 2. Event hook conflicts (same event with the same filter key)
    const hookEvents = new Map<string, string[]>();
    for (const [pluginName, state] of this.activeStates) {
      for (const eventType of state.registeredHooks.keys()) {
        const existing = hookEvents.get(eventType) ?? [];
        existing.push(pluginName);
        hookEvents.set(eventType, existing);
      }
    }
    for (const [eventType, pluginNames] of hookEvents) {
      if (pluginNames.length > 1) {
        // Check if any have conflicting filters on the same event
        const filtersOnEvent = pluginNames.filter((pn) => {
          const state = this.activeStates.get(pn);
          return state?.registeredFilters.has(eventType);
        });
        if (filtersOnEvent.length > 1) {
          conflicts.push({
            type: 'hook',
            plugins: filtersOnEvent,
            detail: `Multiple plugins hook and filter the same event: ${eventType}`,
          });
        }
      }
    }

    // 3. Storefront slot conflicts (same slot + same order)
    for (const [slotName, entries] of this.storefrontSlots) {
      const orderMap = new Map<number, string[]>();
      for (const entry of entries) {
        const existing = orderMap.get(entry.order) ?? [];
        existing.push(entry.pluginName);
        orderMap.set(entry.order, existing);
      }
      for (const [order, pluginNames] of orderMap) {
        if (pluginNames.length > 1) {
          conflicts.push({
            type: 'slot',
            plugins: pluginNames,
            detail: `Multiple plugins claim slot '${slotName}' with order ${order}`,
          });
        }
      }
    }

    // 4. PageBuilder block name conflicts
    const blockNames = new Map<string, string[]>();
    for (const entries of this.pageBuilderBlocks.values()) {
      for (const entry of entries) {
        const existing = blockNames.get(entry.name) ?? [];
        if (!existing.includes(entry.pluginName)) {
          existing.push(entry.pluginName);
        }
        blockNames.set(entry.name, existing);
      }
    }
    for (const [blockName, pluginNames] of blockNames) {
      if (pluginNames.length > 1) {
        conflicts.push({
          type: 'block',
          plugins: pluginNames,
          detail: `Multiple plugins register PageBuilder block: ${blockName}`,
        });
      }
    }

    return conflicts;
  }

  // ─── Dev Mode Hot Reload ──────────────────────────────────────────────────

  private fileWatchers = new Map<string, FSWatcher>();

  /**
   * Watch a plugin's directory for changes and hot-reload on file changes.
   * Only works in development mode (NODE_ENV !== 'production').
   */
  watchPlugin(pluginName: string): { watching: boolean; reason?: string } {
    if (process.env.NODE_ENV === 'production') {
      return { watching: false, reason: 'Hot reload is disabled in production' };
    }

    if (this.fileWatchers.has(pluginName)) {
      return { watching: true, reason: 'Already watching' };
    }

    // Find the plugin's directory — use tracked path first, then search
    const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
    if (!sdkDef) {
      return { watching: false, reason: `Plugin '${pluginName}' not found` };
    }

    let pluginDir: string | null = this.pluginPaths.get(pluginName) ?? null;

    // Fallback: search common paths if not tracked
    if (!pluginDir) {
      const dirName = pluginName.toLowerCase().replace(/\s+/g, '-');
      const slug =
        ((sdkDef as unknown as Record<string, unknown>)._manifestSlug as string) ?? dirName;
      const possiblePaths = [
        resolve(process.cwd(), 'data', 'plugins', slug, `forkcart-plugin-${slug}`),
        resolve(process.cwd(), 'data', 'plugins', slug),
        resolve(process.cwd(), 'data', 'plugins', dirName),
      ];

      for (const p of possiblePaths) {
        try {
          readFileSync(join(p, 'package.json'));
          pluginDir = p;
          break;
        } catch {
          // Try next
        }
      }
    }

    if (!pluginDir) {
      return { watching: false, reason: `Cannot find directory for plugin '${pluginName}'` };
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const watcher = watch(pluginDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      // Ignore non-JS/TS files and node_modules
      if (filename.includes('node_modules')) return;
      if (!/\.(js|ts|json|mjs)$/.test(filename)) return;

      // Debounce — reload once after rapid changes settle
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        logger.info({ pluginName, filename }, 'File changed, reloading plugin');
        this.reloadPlugin(pluginName).catch((err) => {
          logger.error({ pluginName, error: err }, 'Hot reload failed');
        });
      }, 300);
    });

    this.fileWatchers.set(pluginName, watcher);
    logger.info({ pluginName, pluginDir }, 'Watching plugin for changes');
    return { watching: true };
  }

  /** Stop watching a plugin */
  unwatchPlugin(pluginName: string): void {
    const watcher = this.fileWatchers.get(pluginName);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(pluginName);
      logger.info({ pluginName }, 'Stopped watching plugin');
    }
  }

  /** Stop all file watchers */
  unwatchAll(): void {
    for (const [name, watcher] of this.fileWatchers) {
      watcher.close();
      logger.debug({ pluginName: name }, 'Stopped watching plugin');
    }
    this.fileWatchers.clear();
  }

  /**
   * Reload a plugin by name — re-imports the module and re-registers everything.
   * Used by hot reload and the manual reload endpoint.
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, pluginName),
      with: { settings: true },
    });

    if (!plugin) throw new Error(`Plugin not found in DB: ${pluginName}`);

    const wasActive = plugin.isActive;

    // Deactivate if active (unregisters hooks, routes, etc.)
    if (wasActive) {
      await this.deactivatePlugin(plugin.id);
    }

    // Remove old definition
    this.sdkPlugins.delete(pluginName);

    // Re-discover and load the plugin
    const loadedDef = await this.tryLoadInstalledPlugin(
      pluginName,
      plugin.metadata as Record<string, unknown> | null,
    );

    if (!loadedDef) {
      logger.warn({ pluginName }, 'Could not reload plugin — definition not found');
      return;
    }

    // Re-activate if it was active before
    if (wasActive) {
      const rawSettings: Record<string, unknown> = {};
      for (const s of plugin.settings) {
        rawSettings[s.key] = s.value;
      }
      const settings = this.decryptSettings(pluginName, rawSettings);
      await this.activateSdkPlugin(pluginName, loadedDef, settings);
    }

    logger.info({ pluginName }, 'Plugin reloaded successfully');
  }

  // ─── Plugin Version Tracking (onUpdate) ───────────────────────────────────

  /**
   * Handle plugin version updates.
   * Called during ensurePluginInDb when an existing plugin has a new version.
   * Triggers onUpdate lifecycle hook and runs new migrations.
   */
  private async handlePluginUpdate(
    pluginName: string,
    fromVersion: string,
    toVersion: string,
  ): Promise<void> {
    const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
    if (!sdkDef) return;

    logger.info({ pluginName, fromVersion, toVersion }, 'Plugin version update detected');

    // Get settings for context
    const plugin = await this.db.query.plugins.findFirst({
      where: eq(plugins.name, pluginName),
      with: { settings: true },
    });

    if (!plugin) return;

    const rawSettings: Record<string, unknown> = {};
    for (const s of plugin.settings) {
      rawSettings[s.key] = s.value;
    }
    const settings = this.decryptSettings(pluginName, rawSettings);
    const ctx = this.buildPluginContext(pluginName, settings);

    // Run any new migrations
    // Note: Pass ctx.db (the ScopedDatabase), not the full ctx
    if (sdkDef.migrations && sdkDef.migrations.length > 0) {
      const ctxWithDb = ctx as { db: unknown };
      await this.migrationRunner.runPendingMigrations(pluginName, sdkDef.migrations, ctxWithDb.db);
    }

    // Call onUpdate lifecycle hook
    if (sdkDef.onUpdate) {
      try {
        await sdkDef.onUpdate(ctx, fromVersion);
        logger.info({ pluginName, fromVersion, toVersion }, 'Plugin onUpdate completed');
      } catch (error) {
        logger.error({ pluginName, fromVersion, toVersion, error }, 'Plugin onUpdate failed');
      }
    }
  }

  // ─── Admin Pages API ──────────────────────────────────────────────────────

  /** Get admin pages for all active plugins */
  getAllAdminPages(): Array<{
    pluginName: string;
    pages: Array<{
      path: string;
      label: string;
      icon?: string;
      parent?: string;
      order?: number;
      hasContent: boolean;
      hasApiRoute: boolean;
    }>;
  }> {
    const result: Array<{
      pluginName: string;
      pages: Array<{
        path: string;
        label: string;
        icon?: string;
        parent?: string;
        order?: number;
        hasContent: boolean;
        hasApiRoute: boolean;
      }>;
    }> = [];

    for (const [pluginName] of this.activeStates) {
      const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
      if (sdkDef?.adminPages && sdkDef.adminPages.length > 0) {
        result.push({
          pluginName,
          pages: sdkDef.adminPages.map((p) => ({
            path: p.path,
            label: p.label,
            icon: p.icon,
            parent: p.parent,
            order: p.order,
            hasContent: !!p.content,
            hasApiRoute: !!p.apiRoute,
          })),
        });
      }
    }

    return result;
  }

  /** Get the HTML content for a specific plugin admin page */
  getPluginAdminPageContent(pluginName: string, pagePath: string): string | null {
    const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
    if (!sdkDef?.adminPages) return null;

    // Normalize path for comparison
    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    const page = sdkDef.adminPages.find((p) => p.path === normalizedPath || p.path === pagePath);

    return page?.content ?? null;
  }

  /** Get the API route for a specific plugin admin page (if configured) */
  getPluginAdminPageApiRoute(pluginName: string, pagePath: string): string | null {
    const sdkDef = this.sdkPlugins.get(pluginName) ?? this.findSdkDefByName(pluginName);
    if (!sdkDef?.adminPages) return null;

    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    const page = sdkDef.adminPages.find((p) => p.path === normalizedPath || p.path === pagePath);

    return page?.apiRoute ?? null;
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
      // Encrypt secret settings before storing
      const storedValue = this.encryptSettingValue(plugin.name, key, value);

      const existing = plugin.settings.find((s) => s.key === key);
      if (existing) {
        await this.db
          .update(pluginSettings)
          .set({ value: storedValue as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(pluginSettings.id, existing.id));
      } else {
        await this.db.insert(pluginSettings).values({
          pluginId,
          key,
          value: storedValue as Record<string, unknown>,
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

// ─── Health Check Types ───────────────────────────────────────────────────

export interface PluginHealthReport {
  pluginId: string;
  pluginName: string;
  healthy: boolean;
  isActive: boolean;
  migrations: {
    status: 'pending' | 'applied' | 'failed';
    total: number;
    applied: number;
    pending: number;
    failed: boolean;
  };
  settings: {
    valid: boolean;
    issues: string[];
  };
  routes: {
    registered: boolean;
    hasDefinition: boolean;
  };
  dependencies: {
    satisfied: boolean;
    issues: string[];
  };
  hooks: number;
  filters: number;
  lastError: string | null;
}

// ─── Conflict Detection Types ─────────────────────────────────────────────

export interface PluginConflict {
  type: string;
  plugins: string[];
  detail: string;
}
