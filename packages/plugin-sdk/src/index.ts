// ─── Main entry ─────────────────────────────────────────────────────────────
export { definePlugin } from './define.js';

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  PluginType,
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
  PluginHookHandler,
  PluginHooks,
  PluginAdminPage,
  PluginRouter,
  PluginProvider,
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
