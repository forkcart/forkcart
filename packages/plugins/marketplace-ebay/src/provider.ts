import type {
  MarketplaceProvider,
  MarketplaceProductInput,
  MarketplaceListing,
  MarketplaceOrder,
  ShipmentTracking,
  MarketplaceCategory,
} from '@forkcart/core';
import { createLogger } from '@forkcart/core';
import { EbayAuth } from './auth';

const logger = createLogger('ebay-marketplace');

interface EbaySettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  siteId?: string;
  sandbox?: boolean;
}

export class EbayMarketplaceProvider implements MarketplaceProvider {
  readonly id = 'ebay';
  readonly name = 'eBay';

  private auth = new EbayAuth();
  private siteId = 'EBAY_DE';

  async connect(settings: Record<string, unknown>): Promise<void> {
    const s = settings as unknown as EbaySettings;
    this.siteId = (s.siteId as string) ?? 'EBAY_DE';

    this.auth.configure({
      clientId: s.clientId ?? '',
      clientSecret: s.clientSecret ?? '',
      refreshToken: s.refreshToken ?? '',
      sandbox: s.sandbox,
    });

    logger.info({ siteId: this.siteId }, 'eBay marketplace connected');
  }

  async disconnect(): Promise<void> {
    logger.info('eBay marketplace disconnected');
  }

  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.auth.request('GET', '/sell/account/v1/privilege');
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async listProduct(product: MarketplaceProductInput): Promise<MarketplaceListing> {
    // Step 1: Create or replace inventory item
    await this.auth.request(
      'PUT',
      `/sell/inventory/v1/inventory_item/${product.sku}`,
      {
        availability: {
          shipToLocationAvailability: {
            quantity: product.quantity,
          },
        },
        condition: product.attributes?.condition ?? 'NEW',
        product: {
          title: product.name,
          description: product.description,
          imageUrls: product.images,
          aspects: this.buildAspects(product.attributes),
        },
      },
      { 'Content-Language': this.getContentLanguage() },
    );

    // Step 2: Create offer
    const offer = await this.auth.request<{ offerId: string }>('POST', '/sell/inventory/v1/offer', {
      sku: product.sku,
      marketplaceId: this.siteId,
      format: 'FIXED_PRICE',
      listingDescription: product.description,
      pricingSummary: {
        price: {
          value: (product.price / 100).toFixed(2),
          currency: product.currency,
        },
      },
      availableQuantity: product.quantity,
      categoryId: product.categoryId,
      merchantLocationKey: product.attributes?.locationKey,
      listingPolicies: {
        fulfillmentPolicyId: product.attributes?.fulfillmentPolicyId,
        paymentPolicyId: product.attributes?.paymentPolicyId,
        returnPolicyId: product.attributes?.returnPolicyId,
      },
    });

    // Step 3: Publish offer
    const published = await this.auth.request<{ listingId: string }>(
      'POST',
      `/sell/inventory/v1/offer/${offer.offerId}/publish`,
    );

    return {
      id: offer.offerId,
      marketplaceId: 'ebay',
      externalId: published.listingId,
      status: 'active',
      url: `https://www.ebay.com/itm/${published.listingId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateListing(
    listingId: string,
    product: MarketplaceProductInput,
  ): Promise<MarketplaceListing> {
    // Update the inventory item
    await this.auth.request(
      'PUT',
      `/sell/inventory/v1/inventory_item/${product.sku}`,
      {
        availability: {
          shipToLocationAvailability: {
            quantity: product.quantity,
          },
        },
        condition: product.attributes?.condition ?? 'NEW',
        product: {
          title: product.name,
          description: product.description,
          imageUrls: product.images,
          aspects: this.buildAspects(product.attributes),
        },
      },
      { 'Content-Language': this.getContentLanguage() },
    );

    // Update the offer
    await this.auth.request('PUT', `/sell/inventory/v1/offer/${listingId}`, {
      sku: product.sku,
      marketplaceId: this.siteId,
      format: 'FIXED_PRICE',
      listingDescription: product.description,
      pricingSummary: {
        price: {
          value: (product.price / 100).toFixed(2),
          currency: product.currency,
        },
      },
      availableQuantity: product.quantity,
      categoryId: product.categoryId,
    });

    return {
      id: listingId,
      marketplaceId: 'ebay',
      externalId: listingId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteListing(listingId: string): Promise<void> {
    // Withdraw the offer
    await this.auth.request('POST', `/sell/inventory/v1/offer/${listingId}/withdraw`);
  }

  async fetchOrders(since?: Date): Promise<MarketplaceOrder[]> {
    const params = new URLSearchParams({
      limit: '50',
    });

    if (since) {
      // eBay uses filter for date range
      params.set(
        'filter',
        `creationdate:[${since.toISOString()}..] AND orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}`,
      );
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      params.set(
        'filter',
        `creationdate:[${d.toISOString()}..] AND orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}`,
      );
    }

    const data = await this.auth.request<{
      orders: Array<{
        orderId: string;
        orderFulfillmentStatus: string;
        creationDate: string;
        buyer: { username: string; buyerRegistrationAddress?: { email?: string } };
        fulfillmentStartInstructions: Array<{
          shippingStep: {
            shipTo: {
              fullName: string;
              contactAddress: {
                addressLine1: string;
                addressLine2?: string;
                city: string;
                stateOrProvince?: string;
                postalCode: string;
                countryCode: string;
              };
            };
          };
        }>;
        lineItems: Array<{
          sku: string;
          title: string;
          quantity: number;
          lineItemCost: { value: string; currency: string };
        }>;
        pricingSummary: {
          total: { value: string; currency: string };
        };
      }>;
    }>('GET', `/sell/fulfillment/v1/order?${params.toString()}`);

    return (data.orders ?? []).map((o) => {
      const shipTo = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
      const nameParts = (shipTo?.fullName ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      const addr = shipTo?.contactAddress;

      return {
        externalId: o.orderId,
        marketplace: 'ebay',
        status: o.orderFulfillmentStatus,
        customerName: shipTo?.fullName ?? o.buyer.username,
        customerEmail: o.buyer.buyerRegistrationAddress?.email,
        shippingAddress: {
          firstName,
          lastName,
          addressLine1: addr?.addressLine1 ?? '',
          addressLine2: addr?.addressLine2,
          city: addr?.city ?? '',
          state: addr?.stateOrProvince,
          postalCode: addr?.postalCode ?? '',
          country: addr?.countryCode ?? '',
        },
        items: o.lineItems.map((li) => ({
          sku: li.sku,
          name: li.title,
          quantity: li.quantity,
          unitPrice: Math.round(parseFloat(li.lineItemCost.value) * 100),
          currency: li.lineItemCost.currency,
        })),
        totalAmount: Math.round(parseFloat(o.pricingSummary.total.value) * 100),
        currency: o.pricingSummary.total.currency,
        orderedAt: new Date(o.creationDate),
      };
    });
  }

  async acknowledgeOrder(orderId: string): Promise<void> {
    // eBay orders don't require explicit acknowledgment
    logger.info({ orderId }, 'eBay order acknowledged (no-op)');
  }

  async updateShipment(orderId: string, tracking: ShipmentTracking): Promise<void> {
    await this.auth.request('POST', `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`, {
      lineItems: [], // Empty = all items
      shippingCarrierCode: tracking.carrier,
      trackingNumber: tracking.trackingNumber,
    });
  }

  async updateInventory(sku: string, quantity: number): Promise<void> {
    await this.auth.request(
      'PUT',
      `/sell/inventory/v1/inventory_item/${sku}`,
      {
        availability: {
          shipToLocationAvailability: { quantity },
        },
      },
      { 'Content-Language': this.getContentLanguage() },
    );
  }

  async bulkUpdateInventory(items: Array<{ sku: string; quantity: number }>): Promise<void> {
    // eBay bulk migrate API or sequential updates
    const requests = items.map((item) => ({
      sku: item.sku,
      shipToLocationAvailability: { quantity: item.quantity },
    }));

    await this.auth.request('POST', '/sell/inventory/v1/bulk_update_price_quantity', { requests });
  }

  async getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
    const data = await this.auth.request<{
      categoryTreeNode: {
        category: { categoryId: string; categoryName: string };
        childCategoryTreeNodes?: Array<{
          category: { categoryId: string; categoryName: string };
          childCategoryTreeNodes?: Array<{
            category: { categoryId: string; categoryName: string };
          }>;
        }>;
      };
    }>('GET', `/commerce/taxonomy/v1/category_tree/${this.getCategoryTreeId()}`);

    const categories: MarketplaceCategory[] = [];
    const root = data.categoryTreeNode;
    if (root) {
      this.flattenCategories(root, categories);
    }
    return categories;
  }

  // --- Private helpers ---

  private getContentLanguage(): string {
    const langMap: Record<string, string> = {
      EBAY_DE: 'de-DE',
      EBAY_US: 'en-US',
      EBAY_GB: 'en-GB',
      EBAY_FR: 'fr-FR',
      EBAY_IT: 'it-IT',
      EBAY_ES: 'es-ES',
      EBAY_NL: 'nl-NL',
      EBAY_AT: 'de-AT',
    };
    return langMap[this.siteId] ?? 'en-US';
  }

  private getCategoryTreeId(): string {
    const treeMap: Record<string, string> = {
      EBAY_DE: '77',
      EBAY_US: '0',
      EBAY_GB: '3',
      EBAY_FR: '71',
      EBAY_IT: '101',
      EBAY_ES: '186',
      EBAY_NL: '146',
      EBAY_AT: '16',
    };
    return treeMap[this.siteId] ?? '0';
  }

  private buildAspects(attributes?: Record<string, string>): Record<string, string[]> | undefined {
    if (!attributes) return undefined;
    const aspects: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(attributes)) {
      // Skip internal attributes
      if (
        [
          'condition',
          'locationKey',
          'fulfillmentPolicyId',
          'paymentPolicyId',
          'returnPolicyId',
        ].includes(key)
      ) {
        continue;
      }
      aspects[key] = [value];
    }
    return Object.keys(aspects).length > 0 ? aspects : undefined;
  }

  private flattenCategories(
    node: {
      category: { categoryId: string; categoryName: string };
      childCategoryTreeNodes?: Array<{
        category: { categoryId: string; categoryName: string };
        childCategoryTreeNodes?: Array<{
          category: { categoryId: string; categoryName: string };
        }>;
      }>;
    },
    result: MarketplaceCategory[],
    parentId?: string,
    path?: string,
  ): void {
    const currentPath = path
      ? `${path} > ${node.category.categoryName}`
      : node.category.categoryName;

    result.push({
      id: node.category.categoryId,
      name: node.category.categoryName,
      parentId,
      path: currentPath,
    });

    for (const child of node.childCategoryTreeNodes ?? []) {
      this.flattenCategories(child as typeof node, result, node.category.categoryId, currentPath);
    }
  }
}
