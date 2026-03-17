import type {
  MarketplaceProvider,
  MarketplaceProductInput,
  MarketplaceListing,
  MarketplaceOrder,
  ShipmentTracking,
  MarketplaceCategory,
} from '@forkcart/core';
import { createLogger } from '@forkcart/core';
import { AmazonAuth } from './auth';

const logger = createLogger('amazon-marketplace');

/** Default EU marketplace IDs — use these when configuring the plugin */
export const EU_MARKETPLACE_IDS: Record<string, string> = {
  DE: 'A1PA6795UKMFR9',
  FR: 'A13V1IB3VIYZZH',
  IT: 'APJ6JRA9NG5V4',
  ES: 'A1RKKUPIHCS9HS',
  NL: 'A1805IZSGTT6HS',
  SE: 'A2NODRKZP88ZB9',
  PL: 'A1C3SOZRARQ6R3',
  BE: 'AMEN7PMS3EDWL',
  UK: 'A1F83G8C2ARO7P',
};

interface AmazonSettings {
  sellerId: string;
  marketplaceId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  region?: string;
}

export class AmazonMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'amazon';
  readonly name = 'Amazon';

  private auth = new AmazonAuth();
  private sellerId = '';
  private marketplaceId = '';

  async connect(settings: Record<string, unknown>): Promise<void> {
    const s = settings as unknown as AmazonSettings;
    this.sellerId = s.sellerId ?? '';
    this.marketplaceId = s.marketplaceId || 'A1PA6795UKMFR9';

    this.auth.configure({
      clientId: s.clientId ?? '',
      clientSecret: s.clientSecret ?? '',
      refreshToken: s.refreshToken ?? '',
      region: s.region,
    });

    logger.info(
      { sellerId: this.sellerId, marketplaceId: this.marketplaceId },
      'Amazon marketplace connected',
    );
  }

  async disconnect(): Promise<void> {
    logger.info('Amazon marketplace disconnected');
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.auth.request('GET', `/sellers/v1/marketplaceParticipations`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing> {
    // Use JSON_LISTINGS_FEED via Feeds API
    const feedDocument = await this.createFeedDocument();
    const feedContent = this.buildListingsFeed([product]);

    // Upload feed content
    await this.uploadFeedContent(feedDocument.url, feedContent);

    // Submit feed
    const feed = await this.auth.request<{
      feedId: string;
    }>('POST', '/feeds/2021-06-30/feeds', {
      feedType: 'JSON_LISTINGS_FEED',
      marketplaceIds: [this.marketplaceId],
      inputFeedDocumentId: feedDocument.feedDocumentId,
    });

    return {
      id: feed.feedId,
      marketplaceId: 'amazon',
      externalId: product.sku, // ASIN assigned after processing
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateListing(
    listingId: string,
    product: MarketplaceProductInput,
  ): Promise<MarketplaceListing> {
    // Use Listings API PATCH for updates
    await this.auth.request('PATCH', `/listings/2021-08-01/items/${this.sellerId}/${product.sku}`, {
      productType: product.attributes?.productType ?? 'PRODUCT',
      patches: [
        {
          op: 'replace',
          path: '/attributes/item_name',
          value: [{ value: product.name, marketplace_id: this.marketplaceId }],
        },
        {
          op: 'replace',
          path: '/attributes/list_price',
          value: [
            {
              value_with_tax: product.price / 100,
              currency: product.currency,
              marketplace_id: this.marketplaceId,
            },
          ],
        },
        {
          op: 'replace',
          path: '/attributes/product_description',
          value: [{ value: product.description, marketplace_id: this.marketplaceId }],
        },
      ],
    });

    return {
      id: listingId,
      marketplaceId: 'amazon',
      externalId: product.sku,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteListing(listingId: string): Promise<void> {
    await this.auth.request('DELETE', `/listings/2021-08-01/items/${this.sellerId}/${listingId}`, {
      marketplaceIds: [this.marketplaceId],
    });
  }

  async fetchOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const params = new URLSearchParams({
      MarketplaceIds: this.marketplaceId,
      OrderStatuses: 'Unshipped,PartiallyShipped',
    });

    if (since) {
      params.set('CreatedAfter', since.toISOString());
    } else {
      // Default to last 7 days
      const d = new Date();
      d.setDate(d.getDate() - 7);
      params.set('CreatedAfter', d.toISOString());
    }

    const data = await this.auth.request<{
      payload: {
        Orders: Array<{
          AmazonOrderId: string;
          OrderStatus: string;
          PurchaseDate: string;
          OrderTotal?: { Amount: string; CurrencyCode: string };
          ShippingAddress?: {
            Name: string;
            AddressLine1: string;
            AddressLine2?: string;
            City: string;
            StateOrRegion?: string;
            PostalCode: string;
            CountryCode: string;
          };
          BuyerInfo?: { BuyerEmail?: string };
        }>;
      };
    }>('GET', `/orders/v0/orders?${params.toString()}`);

    const orders: MarketplaceOrder[] = [];
    for (const o of data.payload?.Orders ?? []) {
      // Fetch order items
      const itemsData = await this.auth.request<{
        payload: {
          OrderItems: Array<{
            SellerSKU: string;
            Title: string;
            QuantityOrdered: number;
            ItemPrice?: { Amount: string; CurrencyCode: string };
          }>;
        };
      }>('GET', `/orders/v0/orders/${o.AmazonOrderId}/orderItems`);

      const nameParts = (o.ShippingAddress?.Name ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      orders.push({
        externalId: o.AmazonOrderId,
        marketplace: 'amazon',
        status: o.OrderStatus,
        customerName: o.ShippingAddress?.Name ?? 'Unknown',
        customerEmail: o.BuyerInfo?.BuyerEmail,
        shippingAddress: {
          firstName,
          lastName,
          addressLine1: o.ShippingAddress?.AddressLine1 ?? '',
          addressLine2: o.ShippingAddress?.AddressLine2,
          city: o.ShippingAddress?.City ?? '',
          state: o.ShippingAddress?.StateOrRegion,
          postalCode: o.ShippingAddress?.PostalCode ?? '',
          country: o.ShippingAddress?.CountryCode ?? '',
        },
        items: (itemsData.payload?.OrderItems ?? []).map((item) => ({
          sku: item.SellerSKU,
          name: item.Title,
          quantity: item.QuantityOrdered,
          unitPrice: Math.round(parseFloat(item.ItemPrice?.Amount ?? '0') * 100),
          currency: item.ItemPrice?.CurrencyCode ?? 'EUR',
        })),
        totalAmount: Math.round(parseFloat(o.OrderTotal?.Amount ?? '0') * 100),
        currency: o.OrderTotal?.CurrencyCode ?? 'EUR',
        orderedAt: new Date(o.PurchaseDate),
      });
    }

    return orders;
  }

  async acknowledgeOrder(orderId: string): Promise<void> {
    // Amazon doesn't have explicit order acknowledgment via SP-API
    // Orders are acknowledged by updating their status
    logger.info({ orderId }, 'Amazon order acknowledged (no-op for SP-API)');
  }

  async updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void> {
    await this.auth.request('POST', `/orders/v0/orders/${orderId}/shipment`, {
      marketplaceId: this.marketplaceId,
      shipmentStatus: 'ReadyForPickup',
      orderItems: [], // Will be filled with all items
      trackingNumber: tracking.trackingNumber,
      carrierCode: tracking.carrier,
      shippingMethod: 'Standard',
    });
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    await this.auth.request('PUT', `/listings/2021-08-01/items/${this.sellerId}/${sku}`, {
      productType: 'PRODUCT',
      patches: [
        {
          op: 'replace',
          path: '/attributes/fulfillment_availability',
          value: [
            {
              fulfillment_channel_code: 'DEFAULT',
              quantity,
              marketplace_id: this.marketplaceId,
            },
          ],
        },
      ],
    });
  }

  async bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void> {
    // Use feeds for bulk inventory update
    const feedDocument = await this.createFeedDocument();
    const feedContent = JSON.stringify({
      header: {
        sellerId: this.sellerId,
        version: '2.0',
        issueLocale: 'en_US',
      },
      messages: items.map((item, index) => ({
        messageId: index + 1,
        sku: item.sku,
        operationType: 'PATCH',
        body: {
          patches: [
            {
              op: 'replace',
              path: '/attributes/fulfillment_availability',
              value: [
                {
                  fulfillment_channel_code: 'DEFAULT',
                  quantity: item.quantity,
                  marketplace_id: this.marketplaceId,
                },
              ],
            },
          ],
        },
      })),
    });

    await this.uploadFeedContent(feedDocument.url, feedContent);

    await this.auth.request('POST', '/feeds/2021-06-30/feeds', {
      feedType: 'JSON_LISTINGS_FEED',
      marketplaceIds: [this.marketplaceId],
      inputFeedDocumentId: feedDocument.feedDocumentId,
    });
  }

  async getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
    // Amazon uses product type definitions instead of traditional categories
    const data = await this.auth.request<{
      productTypes: Array<{
        name: string;
        displayName: string;
      }>;
    }>(
      'GET',
      `/definitions/2020-09-01/productTypes?marketplaceIds=${this.marketplaceId}&itemLocale=en_US`,
    );

    return (data.productTypes ?? []).map((pt) => ({
      id: pt.name,
      name: pt.displayName ?? pt.name,
    }));
  }

  // --- Private helpers ---

  private async createFeedDocument(): Promise<{
    feedDocumentId: string;
    url: string;
  }> {
    return this.auth.request('POST', '/feeds/2021-06-30/documents', {
      contentType: 'application/json; charset=UTF-8',
    });
  }

  private async uploadFeedContent(url: string, content: string): Promise<void> {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: content,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload feed content: ${res.status}`);
    }
  }

  private buildListingsFeed(products: MarketplaceProductInput[]): string {
    return JSON.stringify({
      header: {
        sellerId: this.sellerId,
        version: '2.0',
        issueLocale: 'en_US',
      },
      messages: products.map((p, i) => ({
        messageId: i + 1,
        sku: p.sku,
        operationType: 'UPDATE',
        body: {
          productType: p.attributes?.productType ?? 'PRODUCT',
          attributes: {
            item_name: [{ value: p.name, marketplace_id: this.marketplaceId }],
            product_description: [{ value: p.description, marketplace_id: this.marketplaceId }],
            list_price: [
              {
                value_with_tax: p.price / 100,
                currency: p.currency,
                marketplace_id: this.marketplaceId,
              },
            ],
            fulfillment_availability: [
              {
                fulfillment_channel_code: 'DEFAULT',
                quantity: p.quantity,
                marketplace_id: this.marketplaceId,
              },
            ],
            main_product_image_locator: p.images[0]
              ? [{ value: p.images[0], marketplace_id: this.marketplaceId }]
              : undefined,
          },
        },
      })),
    });
  }
}
