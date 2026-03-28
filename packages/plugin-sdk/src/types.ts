import type { DomainEvent, PluginEventMap, PluginEventName } from './events.js';
import type { PaymentProviderMethods } from './providers/payment.js';
import type { MarketplaceProviderMethods } from './providers/marketplace.js';
import type { EmailProviderMethods } from './providers/email.js';
import type { ShippingProviderMethods } from './providers/shipping.js';

// ─── Plugin types ───────────────────────────────────────────────────────────

export type PluginType = 'payment' | 'marketplace' | 'email' | 'shipping' | 'analytics' | 'general';

// ─── Plugin permissions ─────────────────────────────────────────────────────

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

// ─── Settings schema ────────────────────────────────────────────────────────

export interface PluginSettingBase {
  label: string;
  description?: string;
  required?: boolean;
}

export interface PluginSettingString extends PluginSettingBase {
  type: 'string';
  default?: string;
  secret?: boolean;
  placeholder?: string;
}

export interface PluginSettingNumber extends PluginSettingBase {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
}

export interface PluginSettingBoolean extends PluginSettingBase {
  type: 'boolean';
  default?: boolean;
}

export interface PluginSettingSelect extends PluginSettingBase {
  type: 'select';
  options: string[];
  default?: string;
}

export type PluginSettingSchema =
  | PluginSettingString
  | PluginSettingNumber
  | PluginSettingBoolean
  | PluginSettingSelect;

/** Record of setting key → schema definition */
export type PluginSettingsMap = Record<string, PluginSettingSchema>;

// ─── Resolved settings value type ───────────────────────────────────────────

/** Infer the runtime value type from a PluginSettingSchema */
type SettingValueType<S extends PluginSettingSchema> = S extends PluginSettingString
  ? string
  : S extends PluginSettingNumber
    ? number
    : S extends PluginSettingBoolean
      ? boolean
      : S extends PluginSettingSelect
        ? string
        : unknown;

/** Given a settings map, produce the resolved values record */
export type ResolvedSettings<T extends PluginSettingsMap> = {
  [K in keyof T]: SettingValueType<T[K]>;
};

// ─── Plugin context ─────────────────────────────────────────────────────────

/** Minimal logger interface plugins receive */
export interface PluginLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/** Minimal EventBus interface plugins interact with */
export interface PluginEventBus {
  on<K extends PluginEventName>(
    eventType: K,
    handler: (event: DomainEvent<PluginEventMap[K]>) => void | Promise<void>,
  ): void;
  off<K extends PluginEventName>(
    eventType: K,
    handler: (event: DomainEvent<PluginEventMap[K]>) => void | Promise<void>,
  ): void;
  emit<K extends PluginEventName>(eventType: K, payload: PluginEventMap[K]): Promise<void>;
}

/** Context injected into plugin lifecycle hooks and event handlers */
export interface PluginContext<TSettings extends PluginSettingsMap = PluginSettingsMap> {
  /** Resolved settings values */
  settings: ResolvedSettings<TSettings>;
  /** Database access (raw drizzle-orm instance) */
  db: unknown;
  /** Scoped logger */
  logger: PluginLogger;
  /** Event bus for subscribing / emitting */
  eventBus: PluginEventBus;
}

// ─── Hook handler types ─────────────────────────────────────────────────────

/** Typed hook handler for a known event */
export type PluginHookHandler<K extends PluginEventName> = (
  event: DomainEvent<PluginEventMap[K]>,
  ctx: PluginContext,
) => void | Promise<void>;

/** Hooks map: event name → handler */
export type PluginHooks = {
  [K in PluginEventName]?: PluginHookHandler<K>;
};

// ─── Admin page definition ──────────────────────────────────────────────────

export interface PluginAdminPage {
  path: string;
  label: string;
  icon?: string;
  /** Parent menu item (for nesting) */
  parent?: string;
  /** Sort order in menu */
  order?: number;
  /** Static HTML content to render in the admin page */
  content?: string;
  /** API route path (relative to plugin routes) that returns { html: string } for dynamic content */
  apiRoute?: string;
}

// ─── Filters (data transformation) ──────────────────────────────────────────

/** Filter names for data transformation (like WordPress apply_filters) */
export type PluginFilterName =
  | 'product:price'
  | 'product:title'
  | 'product:description'
  | 'cart:total'
  | 'cart:shipping'
  | 'cart:tax'
  | 'checkout:payment-methods'
  | 'checkout:shipping-methods'
  | 'order:confirmation-email'
  | 'search:results'
  | 'search:query'
  | 'admin:menu'
  | 'storefront:head'
  | 'storefront:footer';

/** Filter handler receives data and returns (possibly modified) data */
export type PluginFilterHandler<T = unknown> = (data: T, ctx: PluginContext) => T | Promise<T>;

/** Filters map: filter name → handler */
export type PluginFilters = {
  [K in PluginFilterName]?: PluginFilterHandler;
};

// ─── Storefront slots (frontend extension points) ───────────────────────────

/** Storefront slot positions for injecting custom content */
export type StorefrontSlot =
  | 'head'
  | 'body-start'
  | 'body-end'
  | 'header-before'
  | 'header-after'
  | 'footer-before'
  | 'footer-after'
  | 'product-page-top'
  | 'product-page-bottom'
  | 'product-page-sidebar'
  | 'cart-page-top'
  | 'cart-page-bottom'
  | 'checkout-before-payment'
  | 'checkout-after-payment'
  | 'category-page-top'
  | 'category-page-bottom';

/** Content to inject into a storefront slot */
export interface StorefrontSlotContent {
  /** Slot position */
  slot: StorefrontSlot;
  /** HTML content or React component name */
  content: string;
  /** Sort order (lower = earlier) */
  order?: number;
  /** Only show on specific pages */
  pages?: string[];
}

// ─── PageBuilder blocks ─────────────────────────────────────────────────────

/** A custom block that plugins can register for the PageBuilder (Craft.js) */
export interface PageBuilderBlock {
  /** Unique block ID within the plugin (e.g., 'fomo-widget') */
  name: string;
  /** Display name shown in the PageBuilder block picker */
  label: string;
  /** Emoji or icon name for the block picker */
  icon?: string;
  /** Category in the PageBuilder sidebar (default: 'Plugins') */
  category?: string;
  /** Tooltip / description shown on hover */
  description?: string;
  /** HTML content to render */
  content: string;
  /** Fallback slot if admin hasn't placed this block in PageBuilder (e.g., 'product-page-bottom') */
  defaultSlot?: StorefrontSlot | string;
  /** Sort order within the fallback slot (lower = earlier, default: 10) */
  defaultOrder?: number;
  /** Only show on pages matching these patterns (e.g., ['/product/*']) */
  pages?: string[];
  /** Block-specific settings schema */
  settings?: Record<string, unknown>;
}

// ─── Database migrations ────────────────────────────────────────────────────

/** Database migration for plugins that need custom tables */
export interface PluginMigration {
  /** Migration version (semver or integer) */
  version: string;
  /** Human-readable description */
  description: string;
  /**
   * SQL or Drizzle schema to run.
   * Second argument provides helpers like `ref()` for type-safe column references:
   * ```ts
   * up: async (db, { ref }) => {
   *   await db.execute(`CREATE TABLE ... (product_id ${ref('products.id')} NOT NULL)`);
   * }
   * ```
   */
  up: (
    db: unknown,
    helpers?: { ref: (path: string) => string; schema: Record<string, unknown> },
  ) => Promise<void>;
  /** Rollback SQL or Drizzle schema */
  down?: (db: unknown) => Promise<void>;
}

// ─── CLI commands ───────────────────────────────────────────────────────────

/** CLI command definition for plugins */
export interface PluginCliCommand {
  /** Command name (e.g. 'sync' becomes 'forkcart plugin:myplugin:sync') */
  name: string;
  /** Description shown in help */
  description: string;
  /** Command arguments */
  args?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  /** Command options/flags */
  options?: Array<{
    name: string;
    alias?: string;
    description: string;
    type: 'string' | 'boolean' | 'number';
    default?: unknown;
  }>;
  /** Command handler */
  handler: (args: Record<string, unknown>, ctx: PluginContext) => Promise<void>;
}

// ─── Scheduled tasks ────────────────────────────────────────────────────────

/** Scheduled task definition (like WordPress wp_cron) */
export interface PluginScheduledTask {
  /** Task name */
  name: string;
  /** Cron expression (e.g. '0 * * * *' for hourly) */
  schedule: string;
  /** Task handler */
  handler: (ctx: PluginContext) => Promise<void>;
  /** Whether task is enabled by default */
  enabled?: boolean;
}

// ─── Route builder ──────────────────────────────────────────────────────────

/** Minimal Hono-compatible router interface (no Hono dependency) */
export interface PluginRouter {
  get(path: string, handler: (c: unknown) => unknown): void;
  post(path: string, handler: (c: unknown) => unknown): void;
  put(path: string, handler: (c: unknown) => unknown): void;
  delete(path: string, handler: (c: unknown) => unknown): void;
  patch(path: string, handler: (c: unknown) => unknown): void;
}

// ─── Provider union ─────────────────────────────────────────────────────────

export type PluginProvider = Partial<PaymentProviderMethods> &
  Partial<MarketplaceProviderMethods> &
  Partial<EmailProviderMethods> &
  Partial<ShippingProviderMethods>;

// ─── Full plugin definition ─────────────────────────────────────────────────

export interface PluginDefinition<TSettings extends PluginSettingsMap = PluginSettingsMap> {
  /** Unique plugin name (used as identifier) */
  name: string;
  /** Semver version */
  version: string;
  /** Plugin type — determines which provider methods are expected */
  type: PluginType;
  /** Human-readable description */
  description: string;
  /** Author name */
  author: string;
  /** Homepage URL */
  homepage?: string;
  /** Repository URL */
  repository?: string;
  /** License (e.g. 'MIT', 'GPL-3.0') */
  license?: string;
  /** Keywords for marketplace search */
  keywords?: string[];
  /** Minimum ForkCart version required */
  minVersion?: string;

  /** Setting definitions for the admin panel */
  settings?: TSettings;

  /** Called when the plugin is activated */
  onActivate?: (ctx: PluginContext<TSettings>) => void | Promise<void>;
  /** Called when the plugin is deactivated */
  onDeactivate?: (ctx: PluginContext<TSettings>) => void | Promise<void>;
  /** Called when the plugin is installed (first time) */
  onInstall?: (ctx: PluginContext<TSettings>) => void | Promise<void>;
  /** Called when the plugin is uninstalled */
  onUninstall?: (ctx: PluginContext<TSettings>) => void | Promise<void>;
  /** Called when the plugin is updated to a new version */
  onUpdate?: (ctx: PluginContext<TSettings>, fromVersion: string) => void | Promise<void>;
  /** Called when an unhandled error occurs in a hook, route, or scheduled task.
   *  Return `true` to suppress the error, or handle it (e.g. send to Sentry). */
  onError?: (
    error: Error,
    source: { type: 'hook' | 'route' | 'task' | 'filter'; name: string },
    ctx: PluginContext<TSettings>,
  ) => void | boolean | Promise<void | boolean>;
  /** Called on every API server startup (after activation). Use for warmup, cache priming, etc. */
  onReady?: (ctx: PluginContext<TSettings>) => void | Promise<void>;

  /** Event hooks (triggered after events occur) */
  hooks?: PluginHooks;

  /** Filters for data transformation (like WordPress apply_filters) */
  filters?: PluginFilters;

  /** Provider implementation methods */
  provider?: PluginProvider;

  /** Admin panel pages */
  adminPages?: PluginAdminPage[];

  /** Custom HTTP routes mounted under /api/v1/plugins/<name>/ */
  routes?: (router: PluginRouter) => void;

  /** Storefront slots for injecting custom frontend content */
  storefrontSlots?: StorefrontSlotContent[];

  /** PageBuilder blocks — custom blocks that appear in the Craft.js PageBuilder.
   *  Blocks with a `defaultSlot` will automatically fall back to that slot
   *  if the admin hasn't placed them in the page template. */
  pageBuilderBlocks?: PageBuilderBlock[];

  /** Database migrations for custom tables */
  migrations?: PluginMigration[];

  /** CLI commands */
  cli?: PluginCliCommand[];

  /** Scheduled tasks (cron jobs) */
  scheduledTasks?: PluginScheduledTask[];

  /** Plugin dependencies (other plugins that must be installed) */
  dependencies?: string[];

  /** Permissions/capabilities this plugin requires */
  permissions?: PluginPermission[];
}
