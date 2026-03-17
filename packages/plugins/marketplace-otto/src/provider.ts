import type {
  MarketplaceProvider,
  MarketplaceProductInput,
  MarketplaceListing,
  MarketplaceOrder,
  ShipmentTracking,
  MarketplaceCategory,
} from '@forkcart/core';
import { createLogger } from '@forkcart/core';
import { OttoAuth } from './auth';

const logger = createLogger('otto-marketplace');

interface OttoSettings {
  clientId: string;
  clientSecret: string;
}

export class OttoMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'otto';
  readonly name = 'Otto Market';

  private auth = new OttoAuth();

  async connect(settings: Record<string, unknown>): Promise<void> {
    const s = settings as unknown as OttoSettings;
    this.auth.configure({
      clientId: s.clientId ?? '',
      clientSecret: s.clientSecret ?? '',
    });
    logger.info('Otto Market connected');
  }

  async disconnect(): Promise<void> {
    logger.info('Otto Market disconnected');
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.auth.request('GET', '/v2/products?limit=1');
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing> {
    const ottoProduct = this.buildOttoProduct(product);

    await this.auth.request('POST', '/v3/products', [ottoProduct]);

    return {
      id: product.sku,
      marketplaceId: 'otto',
      externalId: product.sku,
      status: 'pending', // Otto reviews products before activation
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateListing(
    listingId: string,
    product: MarketplaceProductInput,
  ): Promise<MarketplaceListing> {
    const ottoProduct = this.buildOttoProduct(product);

    // Otto uses POST for both create and update (upsert)
    await this.auth.request('POST', '/v3/products', [ottoProduct]);

    return {
      id: listingId,
      marketplaceId: 'otto',
      externalId: product.sku,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteListing(listingId: string): Promise<void> {
    // Otto doesn't have a delete endpoint — deactivate by setting quantity to 0
    await this.auth.request('POST', '/v2/quantities', [{ sku: listingId, quantity: 0 }]);
    logger.info({ listingId }, 'Otto listing deactivated (quantity set to 0)');
  }

  async fetchOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const params = new URLSearchParams({
      limit: '100',
      orderColumnType: 'ORDER_LIFECYCLE_DATE',
    });

    if (since) {
      params.set('fromDate', since.toISOString());
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      params.set('fromDate', d.toISOString());
    }

    // Fetch processable orders
    params.set('fulfillmentStatus', 'PROCESSABLE');

    const data = await this.auth.request<{
      content: Array<{
        salesOrderId: string;
        orderDate: string;
        deliveryAddress: {
          firstName: string;
          lastName: string;
          street: string;
          houseNumber?: string;
          zipCode: string;
          city: string;
          countryCode: string;
        };
        positionItems: Array<{
          positionItemId: string;
          product: {
            sku: string;
            productTitle: string;
          };
          itemValueGrossPrice: { amount: number; currency: string };
          cancellationDate?: string;
        }>;
        payment: {
          amount: { amount: number; currency: string };
        };
      }>;
    }>('GET', `/v4/orders?${params.toString()}`);

    return (data.content ?? []).map((o) => ({
      externalId: o.salesOrderId,
      marketplace: 'otto',
      status: 'PROCESSABLE',
      customerName: `${o.deliveryAddress.firstName} ${o.deliveryAddress.lastName}`,
      shippingAddress: {
        firstName: o.deliveryAddress.firstName,
        lastName: o.deliveryAddress.lastName,
        addressLine1: o.deliveryAddress.houseNumber
          ? `${o.deliveryAddress.street} ${o.deliveryAddress.houseNumber}`
          : o.deliveryAddress.street,
        city: o.deliveryAddress.city,
        postalCode: o.deliveryAddress.zipCode,
        country: o.deliveryAddress.countryCode,
      },
      items: o.positionItems
        .filter((pi) => !pi.cancellationDate)
        .map((pi) => ({
          sku: pi.product.sku,
          name: pi.product.productTitle,
          quantity: 1, // Otto uses one positionItem per unit
          unitPrice: Math.round(pi.itemValueGrossPrice.amount * 100),
          currency: pi.itemValueGrossPrice.currency,
        })),
      totalAmount: Math.round(o.payment.amount.amount * 100),
      currency: o.payment.amount.currency,
      orderedAt: new Date(o.orderDate),
    }));
  }

  async acknowledgeOrder(orderId: string): Promise<void> {
    logger.info({ orderId }, 'Otto order acknowledged (no-op — auto-acknowledged)');
  }

  async updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void> {
    // Otto shipments are created per position item
    // First get order details to find position item IDs
    const order = await this.auth.request<{
      positionItems: Array<{ positionItemId: string }>;
    }>('GET', `/v4/orders/${orderId}`);

    const positionItemIds = (order.positionItems ?? []).map((pi) => pi.positionItemId);

    if (positionItemIds.length === 0) {
      logger.warn({ orderId }, 'No position items found for shipment');
      return;
    }

    await this.auth.request('POST', '/v1/shipments', {
      trackingKey: {
        carrier: this.mapOttoCarrier(tracking.carrier),
        trackingNumber: tracking.trackingNumber,
      },
      positionItems: positionItemIds.map((id) => ({ positionItemId: id })),
    });
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    await this.auth.request('POST', '/v2/quantities', [{ sku, quantity }]);
  }

  async bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void> {
    // Otto accepts up to 200 items per request
    const batchSize = 200;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
      }));
      await this.auth.request('POST', '/v2/quantities', batch);
    }
  }

  async getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
    const data = await this.auth.request<{
      content: Array<{
        categoryGroup: string;
        categories: Array<{
          name: string;
          additionalCategories?: string[];
        }>;
      }>;
    }>('GET', '/v2/products/categories');

    const categories: MarketplaceCategory[] = [];
    for (const group of data.content ?? []) {
      categories.push({
        id: group.categoryGroup,
        name: group.categoryGroup,
      });

      for (const cat of group.categories ?? []) {
        categories.push({
          id: cat.name,
          name: cat.name,
          parentId: group.categoryGroup,
        });
      }
    }

    return categories;
  }

  // --- Private helpers ---

  private buildOttoProduct(product: MarketplaceProductInput): Record<string, unknown> {
    return {
      productDescription: [
        {
          category: product.categoryId ?? product.attributes?.category ?? 'Sonstiges',
          brand: product.attributes?.brand ?? '',
          productLine: product.attributes?.productLine,
          manufacturer: product.attributes?.manufacturer,
          productionDate: product.attributes?.productionDate,
          multiPack: false,
          bundle: false,
          fscCertified: false,
          disposal: false,
          productUrl: product.attributes?.productUrl,
          description: product.description,
          bulletPoints: product.attributes?.bulletPoints
            ? [product.attributes.bulletPoints]
            : [product.description.substring(0, 200)],
          attributes: Object.entries(product.attributes ?? {})
            .filter(
              ([k]) =>
                ![
                  'category',
                  'brand',
                  'productLine',
                  'manufacturer',
                  'productionDate',
                  'productUrl',
                  'bulletPoints',
                ].includes(k),
            )
            .map(([name, value]) => ({
              name,
              values: [value],
            })),
        },
      ],
      ean: product.attributes?.ean ?? product.sku,
      sku: product.sku,
      productTitle: product.name,
      pricing: {
        standardPrice: {
          amount: product.price / 100,
          currency: product.currency,
        },
      },
      delivery: {
        deliveryTime: 3,
        type: 'PARCEL',
      },
      mediaAssets: product.images.map((url, i) => ({
        location: url,
        type: 'IMAGE',
        position: i,
      })),
    };
  }

  private mapOttoCarrier(carrier: string): string {
    const mapping: Record<string, string> = {
      dhl: 'DHL',
      dpd: 'DPD',
      hermes: 'HERMES',
      gls: 'GLS',
      ups: 'UPS',
      fedex: 'FEDEX',
      dhl_express: 'DHL_EXPRESS',
    };
    return mapping[carrier.toLowerCase()] ?? carrier.toUpperCase();
  }
}
