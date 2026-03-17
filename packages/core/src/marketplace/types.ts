export interface MarketplaceProvider {
  id: string; // 'amazon', 'ebay', 'otto', 'kaufland'
  name: string;

  // Connection
  connect(settings: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message?: string }>;

  // Product Sync (ForkCart → Marketplace)
  listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing>;
  updateListing(listingId: string, product: MarketplaceProductInput): Promise<MarketplaceListing>;
  deleteListing(listingId: string): Promise<void>;

  // Order Import (Marketplace → ForkCart)
  fetchOrders(since?: Date): Promise<MarketplaceOrder[]>;
  acknowledgeOrder(orderId: string): Promise<void>;
  updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void>;

  // Inventory Sync
  updateInventory(sku: string, quantity: number): Promise<void>;
  bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void>;

  // Category Mapping
  getMarketplaceCategories(): Promise<MarketplaceCategory[]>;
}

export interface MarketplaceProductInput {
  sku: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  quantity: number;
  images: string[]; // URLs
  weight?: number;
  weightUnit?: string;
  attributes?: Record<string, string>;
  variants?: MarketplaceVariantInput[];
  categoryId?: string; // mapped marketplace category
}

export interface MarketplaceVariantInput {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  attributes: Record<string, string>;
}

export interface MarketplaceListing {
  id: string; // marketplace-specific listing ID
  marketplaceId: string; // 'amazon', 'ebay'
  externalId: string; // ASIN, eBay item ID, etc.
  status: 'active' | 'inactive' | 'pending' | 'error';
  url?: string; // link to listing on marketplace
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceOrder {
  externalId: string;
  marketplace: string;
  status: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  orderedAt: Date;
}

export interface ShipmentTracking {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  parentId?: string;
  path?: string;
}
