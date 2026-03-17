import type { DomainEvent, PluginEventMap, PluginEventName } from './events.js';
import type { PaymentProviderMethods } from './providers/payment.js';
import type { MarketplaceProviderMethods } from './providers/marketplace.js';
import type { EmailProviderMethods } from './providers/email.js';
import type { ShippingProviderMethods } from './providers/shipping.js';

// ─── Plugin types ───────────────────────────────────────────────────────────

export type PluginType = 'payment' | 'marketplace' | 'email' | 'shipping' | 'analytics' | 'general';

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

  /** Setting definitions for the admin panel */
  settings?: TSettings;

  /** Called when the plugin is activated */
  onActivate?: (ctx: PluginContext<TSettings>) => void | Promise<void>;
  /** Called when the plugin is deactivated */
  onDeactivate?: (ctx: PluginContext<TSettings>) => void | Promise<void>;

  /** Event hooks */
  hooks?: PluginHooks;

  /** Provider implementation methods */
  provider?: PluginProvider;

  /** Admin panel pages */
  adminPages?: PluginAdminPage[];

  /** Custom HTTP routes mounted under /api/v1/plugins/<name>/ */
  routes?: (router: PluginRouter) => void;
}
