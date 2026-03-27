// ─── Main entry ─────────────────────────────────────────────────────────────
export { definePlugin } from './define.js';

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  // Core types
  PluginType,
  PluginPermission,
  PluginSettingSchema,
  PluginSettingString,
  PluginSettingNumber,
  PluginSettingBoolean,
  PluginSettingSelect,
  PluginSettingsMap,
  ResolvedSettings,
  PluginLogger,
  PluginEventBus,
  PluginContext,
  // Event hooks
  PluginHookHandler,
  PluginHooks,
  // Filters (data transformation)
  PluginFilterName,
  PluginFilterHandler,
  PluginFilters,
  // Admin pages
  PluginAdminPage,
  // Routes
  PluginRouter,
  // Providers
  PluginProvider,
  // Storefront slots
  StorefrontSlot,
  StorefrontSlotContent,
  // PageBuilder blocks
  PageBuilderBlock,
  // Database migrations
  PluginMigration,
  // CLI commands
  PluginCliCommand,
  // Scheduled tasks
  PluginScheduledTask,
  // Main definition
  PluginDefinition,
} from './types.js';

// ─── Events ─────────────────────────────────────────────────────────────────
export type {
  DomainEvent,
  OrderCreatedPayload,
  OrderPaidPayload,
  OrderShippedPayload,
  OrderCancelledPayload,
  OrderRefundedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  ProductDeletedPayload,
  CartCreatedPayload,
  CartUpdatedPayload,
  CartItemAddedPayload,
  CartItemRemovedPayload,
  CustomerRegisteredPayload,
  CustomerUpdatedPayload,
  CheckoutStartedPayload,
  CheckoutCompletedPayload,
  InventoryUpdatedPayload,
  InventoryLowPayload,
  PluginActivatedPayload,
  PluginDeactivatedPayload,
  PluginEventName,
  PluginEventMap,
} from './events.js';
export { PLUGIN_EVENTS } from './events.js';

// ─── Provider interfaces ────────────────────────────────────────────────────
export type {
  ProviderSettingDef,
  PaymentIntentResult,
  PaymentIntentInput,
  PaymentWebhookEvent,
  PaymentStatus,
  PaymentProviderClientConfig,
  PaymentProviderMethods,
  MarketplaceProductInput,
  MarketplaceVariantInput,
  MarketplaceListing,
  MarketplaceOrder,
  ShipmentTracking,
  MarketplaceCategory,
  MarketplaceProviderMethods,
  EmailSendResult,
  EmailSendInput,
  EmailProviderMethods,
  ShippingRate,
  ShippingAddress,
  ShippingParcel,
  ShippingLabel,
  ShippingTrackingStatus,
  ShippingProviderMethods,
} from './providers/index.js';
