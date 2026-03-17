/** Input for listing a product on a marketplace */
export interface MarketplaceProductInput {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  images: string[];
  weight?: number;
  weightUnit?: string;
  attributes?: Record<string, string>;
  variants?: MarketplaceVariantInput[];
  categoryId?: string;
}

export interface MarketplaceVariantInput {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  attributes: Record<string, string>;
}

export interface MarketplaceListing {
  id: string;
  marketplaceId: string;
  externalId: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceOrder {
  externalOrderId: string;
  marketplaceId: string;
  status: string;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
    currency: string;
  }>;
  shippingAddress?: Record<string, unknown>;
  createdAt: Date;
}

export interface ShipmentTracking {
  trackingNumber: string;
  carrier: string;
  url?: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  parentId?: string;
}

/** Marketplace provider interface for plugins */
export interface MarketplaceProviderMethods {
  /** Connect to the marketplace with given settings */
  connect(settings: Record<string, unknown>): Promise<void>;
  /** Disconnect from the marketplace */
  disconnect(): Promise<void>;
  /** Test the current connection */
  testConnection(): Promise<{ ok: boolean; message?: string }>;
  /** List a product on the marketplace */
  listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing>;
  /** Update an existing listing */
  updateListing(listingId: string, product: MarketplaceProductInput): Promise<MarketplaceListing>;
  /** Delete a listing */
  deleteListing(listingId: string): Promise<void>;
  /** Fetch orders from the marketplace */
  fetchOrders(since?: Date): Promise<MarketplaceOrder[]>;
  /** Acknowledge receipt of an order */
  acknowledgeOrder(orderId: string): Promise<void>;
  /** Update shipment info for an order */
  updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void>;
  /** Update inventory for a single SKU */
  updateInventory(sku: string, quantity: number): Promise<void>;
  /** Bulk update inventory */
  bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void>;
  /** Get available marketplace categories */
  getMarketplaceCategories(): Promise<MarketplaceCategory[]>;
}
