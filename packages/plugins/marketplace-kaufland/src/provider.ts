import type {
  MarketplaceProvider,
  MarketplaceProductInput,
  MarketplaceListing,
  MarketplaceOrder,
  ShipmentTracking,
  MarketplaceCategory,
} from '@forkcart/core';
import { createLogger } from '@forkcart/core';
import { KauflandAuth } from './auth';

const logger = createLogger('kaufland-marketplace');

/** Kaufland storefront IDs */
const STOREFRONT_IDS: Record<string, number> = {
  DE: 1,
  SK: 2,
  CZ: 3,
  PL: 7,
  AT: 8,
};

interface KauflandSettings {
  clientKey: string;
  secretKey: string;
  storefront?: string;
}

export class KauflandMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'kaufland';
  readonly name = 'Kaufland';

  private auth = new KauflandAuth();
  private storefrontId = 1; // DE default

  async connect(settings: Record<string, unknown>): Promise<void> {
    const s = settings as unknown as KauflandSettings;
    this.storefrontId = STOREFRONT_IDS[(s.storefront ?? 'DE').toUpperCase()] ?? 1;

    this.auth.configure({
      clientKey: s.clientKey ?? '',
      secretKey: s.secretKey ?? '',
    });

    logger.info({ storefrontId: this.storefrontId }, 'Kaufland marketplace connected');
  }

  async disconnect(): Promise<void> {
    logger.info('Kaufland marketplace disconnected');
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.auth.request('GET', '/info/locale');
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing> {
    // Step 1: Create or import the product
    const ean = product.attributes?.ean ?? product.sku;

    // Try to find existing product by EAN
    let productId: number | undefined;
    try {
      const existing = await this.auth.request<{
        data: Array<{ id_product: number }>;
      }>('GET', '/products', undefined, {
        ean: ean,
        storefront: this.storefrontId.toString(),
      });
      productId = existing.data?.[0]?.id_product;
    } catch {
      // Product doesn't exist yet
    }

    if (!productId) {
      // Import product via product data import
      const importResult = await this.auth.request<{
        data: { id_import_file: number };
      }>('POST', '/product-data/import', {
        url: product.images[0],
        // Kaufland product data import expects a CSV/file URL
        // For direct creation, we use the units approach
      });
      logger.info({ importResult }, 'Product import initiated');
    }

    // Step 2: Create unit (listing)
    const unit = await this.auth.request<{
      data: { id_unit: number };
    }>('POST', '/units', {
      ean,
      condition: product.attributes?.condition ?? 'new',
      listing_price: product.price, // Kaufland expects price in cents
      minimum_price: product.price,
      amount: product.quantity,
      note: product.description,
      id_offer: product.sku,
      handling_time: parseInt(product.attributes?.handlingTime ?? '3', 10),
      warehouse: product.attributes?.warehouse ?? 'default',
      storefront: this.storefrontId,
    });

    return {
      id: unit.data?.id_unit?.toString() ?? product.sku,
      marketplaceId: 'kaufland',
      externalId: unit.data?.id_unit?.toString() ?? product.sku,
      status: 'active',
      url: `https://www.kaufland.de/product/${ean}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateListing(
    listingId: string,
    product: MarketplaceProductInput,
  ): Promise<MarketplaceListing> {
    await this.auth.request('PATCH', `/units/${listingId}`, {
      listing_price: product.price,
      minimum_price: product.price,
      amount: product.quantity,
      note: product.description,
      handling_time: parseInt(product.attributes?.handlingTime ?? '3', 10),
    });

    return {
      id: listingId,
      marketplaceId: 'kaufland',
      externalId: listingId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteListing(listingId: string): Promise<void> {
    await this.auth.request('DELETE', `/units/${listingId}`);
  }

  async fetchOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const params: Record<string, string> = {
      storefront: this.storefrontId.toString(),
      limit: '100',
      fulfillment_type: 'fulfilled_by_merchant',
    };

    if (since) {
      params.ts_created_from_iso = since.toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      params.ts_created_from_iso = d.toISOString();
    }

    const data = await this.auth.request<{
      data: Array<{
        id_order: string;
        ts_created: string;
        status: string;
        buyer: {
          firstname: string;
          lastname: string;
          email?: string;
          street: string;
          house_number?: string;
          postcode: string;
          city: string;
          country: string;
        };
        order_units: Array<{
          id_order_unit: number;
          ean: string;
          title: string;
          quantity: number;
          price_gross: number;
          currency: string;
          status: string;
        }>;
        total_gross: number;
        currency: string;
      }>;
    }>('GET', '/orders', undefined, params);

    return (data.data ?? []).map((o) => ({
      externalId: o.id_order,
      marketplace: 'kaufland',
      status: o.status,
      customerName: `${o.buyer.firstname} ${o.buyer.lastname}`,
      customerEmail: o.buyer.email,
      shippingAddress: {
        firstName: o.buyer.firstname,
        lastName: o.buyer.lastname,
        addressLine1: o.buyer.house_number
          ? `${o.buyer.street} ${o.buyer.house_number}`
          : o.buyer.street,
        city: o.buyer.city,
        postalCode: o.buyer.postcode,
        country: o.buyer.country,
      },
      items: o.order_units.map((u) => ({
        sku: u.ean,
        name: u.title,
        quantity: u.quantity,
        unitPrice: u.price_gross,
        currency: u.currency ?? o.currency ?? 'EUR',
      })),
      totalAmount: o.total_gross,
      currency: o.currency ?? 'EUR',
      orderedAt: new Date(o.ts_created),
    }));
  }

  async acknowledgeOrder(orderId: string): Promise<void> {
    logger.info({ orderId }, 'Kaufland order acknowledged (no-op)');
  }

  async updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void> {
    // Get order units to mark as shipped
    const order = await this.auth.request<{
      data: {
        order_units: Array<{ id_order_unit: number }>;
      };
    }>('GET', `/orders/${orderId}`, undefined, {
      storefront: this.storefrontId.toString(),
    });

    for (const unit of order.data?.order_units ?? []) {
      await this.auth.request('PATCH', `/order-units/${unit.id_order_unit}/send`, {
        tracking_numbers: [tracking.trackingNumber],
        carrier_code: this.mapKauflandCarrier(tracking.carrier),
      });
    }
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    // Find units by SKU/offer ID
    const units = await this.auth.request<{
      data: Array<{ id_unit: number }>;
    }>('GET', '/units', undefined, {
      id_offer: sku,
      storefront: this.storefrontId.toString(),
    });

    for (const unit of units.data ?? []) {
      await this.auth.request('PATCH', `/units/${unit.id_unit}`, {
        amount: quantity,
      });
    }
  }

  async bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void> {
    // Kaufland doesn't have a bulk update endpoint; do sequential
    for (const item of items) {
      await this.updateInventory(item.sku, item.quantity);
    }
  }

  async getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
    const data = await this.auth.request<{
      data: Array<{
        id_category: number;
        name: string;
        id_parent_category?: number;
        title_singular: string;
        url: string;
      }>;
    }>('GET', '/categories', undefined, {
      storefront: this.storefrontId.toString(),
      limit: '500',
    });

    return (data.data ?? []).map((c) => ({
      id: c.id_category.toString(),
      name: c.name || c.title_singular,
      parentId: c.id_parent_category?.toString(),
    }));
  }

  // --- Private helpers ---

  private mapKauflandCarrier(carrier: string): string {
    const mapping: Record<string, string> = {
      dhl: 'DHL',
      dpd: 'DPD',
      hermes: 'HERMES',
      gls: 'GLS',
      ups: 'UPS',
      fedex: 'FEDEX',
      'deutsche post': 'DEUTSCHE_POST',
    };
    return mapping[carrier.toLowerCase()] ?? carrier.toUpperCase();
  }
}
