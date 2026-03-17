// ─── Event Payload Types ────────────────────────────────────────────────────
// These mirror the domain events emitted by @forkcart/core but live here so
// plugin authors never need a dependency on core.

/** Base domain event wrapper (matches core EventBus format) */
export interface DomainEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ─── Order events ───────────────────────────────────────────────────────────

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    productId: string;
    variantId?: string;
    sku?: string;
    quantity: number;
    price: number;
  }>;
}

export interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  provider: string;
}

export interface OrderShippedPayload {
  orderId: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
}

export interface OrderRefundedPayload {
  orderId: string;
  refundAmount: number;
  currency: string;
}

// ─── Product events ─────────────────────────────────────────────────────────

export interface ProductCreatedPayload {
  productId: string;
  name: string;
  sku?: string;
  price: number;
}

export interface ProductUpdatedPayload {
  productId: string;
  changes: Record<string, unknown>;
}

export interface ProductDeletedPayload {
  productId: string;
}

// ─── Cart events ────────────────────────────────────────────────────────────

export interface CartCreatedPayload {
  cartId: string;
  customerId?: string;
}

export interface CartUpdatedPayload {
  cartId: string;
  itemCount: number;
  totalAmount: number;
}

export interface CartItemAddedPayload {
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CartItemRemovedPayload {
  cartId: string;
  productId: string;
  variantId?: string;
}

// ─── Customer events ────────────────────────────────────────────────────────

export interface CustomerRegisteredPayload {
  customerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface CustomerUpdatedPayload {
  customerId: string;
  changes: Record<string, unknown>;
}

// ─── Checkout events ────────────────────────────────────────────────────────

export interface CheckoutStartedPayload {
  cartId: string;
  customerId?: string;
}

export interface CheckoutCompletedPayload {
  orderId: string;
  cartId: string;
  customerId: string;
  totalAmount: number;
}

// ─── Inventory events ───────────────────────────────────────────────────────

export interface InventoryUpdatedPayload {
  productId: string;
  variantId?: string;
  sku?: string;
  oldQuantity: number;
  newQuantity: number;
}

export interface InventoryLowPayload {
  productId: string;
  variantId?: string;
  sku?: string;
  currentQuantity: number;
  threshold: number;
}

// ─── Plugin lifecycle events ────────────────────────────────────────────────

export interface PluginActivatedPayload {
  pluginName: string;
  pluginVersion: string;
}

export interface PluginDeactivatedPayload {
  pluginName: string;
}

// ─── Event name constants ───────────────────────────────────────────────────

export const PLUGIN_EVENTS = {
  // Order
  ORDER_CREATED: 'order:created',
  ORDER_PAID: 'order:paid',
  ORDER_SHIPPED: 'order:shipped',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_REFUNDED: 'order:refunded',

  // Product
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',

  // Cart
  CART_CREATED: 'cart:created',
  CART_UPDATED: 'cart:updated',
  CART_ITEM_ADDED: 'cart:item-added',
  CART_ITEM_REMOVED: 'cart:item-removed',

  // Customer
  CUSTOMER_REGISTERED: 'customer:registered',
  CUSTOMER_UPDATED: 'customer:updated',

  // Checkout
  CHECKOUT_STARTED: 'checkout:started',
  CHECKOUT_COMPLETED: 'checkout:completed',

  // Inventory
  INVENTORY_UPDATED: 'inventory:updated',
  INVENTORY_LOW: 'inventory:low',

  // Plugin lifecycle
  PLUGIN_ACTIVATED: 'plugin:activated',
  PLUGIN_DEACTIVATED: 'plugin:deactivated',
} as const;

/** Union type of all known event names */
export type PluginEventName = (typeof PLUGIN_EVENTS)[keyof typeof PLUGIN_EVENTS];

/** Maps event name → payload type for strongly-typed hooks */
export interface PluginEventMap {
  'order:created': OrderCreatedPayload;
  'order:paid': OrderPaidPayload;
  'order:shipped': OrderShippedPayload;
  'order:cancelled': OrderCancelledPayload;
  'order:refunded': OrderRefundedPayload;
  'product:created': ProductCreatedPayload;
  'product:updated': ProductUpdatedPayload;
  'product:deleted': ProductDeletedPayload;
  'cart:created': CartCreatedPayload;
  'cart:updated': CartUpdatedPayload;
  'cart:item-added': CartItemAddedPayload;
  'cart:item-removed': CartItemRemovedPayload;
  'customer:registered': CustomerRegisteredPayload;
  'customer:updated': CustomerUpdatedPayload;
  'checkout:started': CheckoutStartedPayload;
  'checkout:completed': CheckoutCompletedPayload;
  'inventory:updated': InventoryUpdatedPayload;
  'inventory:low': InventoryLowPayload;
  'plugin:activated': PluginActivatedPayload;
  'plugin:deactivated': PluginDeactivatedPayload;
}
