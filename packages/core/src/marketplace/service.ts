import { eq, desc, and } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import {
  marketplaceConnections,
  marketplaceListings,
  marketplaceOrders,
  marketplaceSyncLogs,
  orders,
  orderItems,
  orderStatusHistory,
  customers,
  addresses,
  media,
} from '@forkcart/database/schemas';
import { products } from '@forkcart/database/schemas';
import { asc } from 'drizzle-orm';
import type { MarketplaceProviderRegistry } from './registry';
import type { MarketplaceProductInput, MarketplaceOrder } from './types';
import { encryptSecret, decryptSecret, isEncrypted } from '../utils/crypto';
import { createLogger } from '../lib/logger';

const logger = createLogger('marketplace-service');

/** Keys in marketplace connection settings that contain secrets */
const SECRET_SETTING_KEYS = [
  'apiKey',
  'apiSecret',
  'secretKey',
  'secret_key',
  'accessKey',
  'access_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'password',
  'clientSecret',
  'client_secret',
  'lwaClientSecret',
  'lwa_client_secret',
  'appSecret',
  'app_secret',
];

export interface MarketplaceServiceDeps {
  db: Database;
  registry: MarketplaceProviderRegistry;
}

export class MarketplaceService {
  private db: Database;
  private registry: MarketplaceProviderRegistry;

  constructor(deps: MarketplaceServiceDeps) {
    this.db = deps.db;
    this.registry = deps.registry;
  }

  // ─── Secret Encryption Helpers ─────────────────────────────────────────────

  /** Check if a setting key is likely a secret */
  private isSecretKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SECRET_SETTING_KEYS.some((sk) => lowerKey === sk.toLowerCase());
  }

  /** Encrypt secret values in a settings object before storing */
  private encryptSettings(settings: Record<string, unknown>): Record<string, unknown> {
    const encrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (
        this.isSecretKey(key) &&
        typeof value === 'string' &&
        value !== '' &&
        !isEncrypted(value)
      ) {
        encrypted[key] = encryptSecret(value);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  /** Decrypt secret values in a settings object for use */
  private decryptSettings(settings: Record<string, unknown>): Record<string, unknown> {
    const decrypted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (this.isSecretKey(key) && typeof value === 'string' && isEncrypted(value)) {
        decrypted[key] = decryptSecret(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }

  /** Mask secret values for API responses */
  private maskSettings(settings: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (this.isSecretKey(key) && typeof value === 'string' && value !== '') {
        masked[key] = '••••••••';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  // ─── Connections ───────────────────────────────────────────────────────────

  async getConnections() {
    const connections = await this.db.query.marketplaceConnections.findMany({
      orderBy: [desc(marketplaceConnections.createdAt)],
    });
    // Mask secrets in response
    return connections.map((c) => ({
      ...c,
      settings: this.maskSettings(c.settings as Record<string, unknown>),
    }));
  }

  async getConnection(id: string) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: eq(marketplaceConnections.id, id),
    });
    if (!connection) return connection;
    return {
      ...connection,
      settings: this.maskSettings(connection.settings as Record<string, unknown>),
    };
  }

  /** Get connection with decrypted settings (internal use only) */
  private async getConnectionDecrypted(id: string) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: eq(marketplaceConnections.id, id),
    });
    if (!connection) return connection;
    return {
      ...connection,
      settings: this.decryptSettings(connection.settings as Record<string, unknown>),
    };
  }

  async saveConnection(input: {
    marketplaceId: string;
    name: string;
    settings: Record<string, unknown>;
  }) {
    const encryptedSettings = this.encryptSettings(input.settings);
    const [connection] = await this.db
      .insert(marketplaceConnections)
      .values({
        marketplaceId: input.marketplaceId,
        name: input.name,
        settings: encryptedSettings,
        status: 'disconnected',
      })
      .returning();
    return connection ? { ...connection, settings: this.maskSettings(input.settings) } : connection;
  }

  async updateConnection(
    id: string,
    input: {
      name?: string;
      settings?: Record<string, unknown>;
      status?: string;
    },
  ) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updates['name'] = input.name;
    if (input.settings !== undefined) updates['settings'] = this.encryptSettings(input.settings);
    if (input.status !== undefined) updates['status'] = input.status;

    const [connection] = await this.db
      .update(marketplaceConnections)
      .set(updates)
      .where(eq(marketplaceConnections.id, id))
      .returning();
    if (!connection) return connection;
    return {
      ...connection,
      settings: this.maskSettings(connection.settings as Record<string, unknown>),
    };
  }

  async deleteConnection(id: string) {
    await this.db.delete(marketplaceConnections).where(eq(marketplaceConnections.id, id));
  }

  async testConnection(id: string) {
    const connection = await this.getConnectionDecrypted(id);
    if (!connection) throw new Error('Connection not found');

    const provider = this.registry.get(connection.marketplaceId);
    if (!provider) {
      return { ok: false, message: `No provider registered for "${connection.marketplaceId}"` };
    }

    try {
      await provider.connect(connection.settings as Record<string, unknown>);
      const result = await provider.testConnection();

      // Update connection status
      await this.updateConnection(id, {
        status: result.ok ? 'connected' : 'error',
      });

      return result;
    } catch (err) {
      await this.updateConnection(id, { status: 'error' });
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      };
    }
  }

  // ─── Product Sync ─────────────────────────────────────────────────────────

  async syncProducts(marketplaceId: string, productIds?: string[]) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: eq(marketplaceConnections.marketplaceId, marketplaceId),
    });
    if (!connection) throw new Error(`No connection for marketplace "${marketplaceId}"`);

    const provider = this.registry.get(marketplaceId);
    if (!provider) throw new Error(`No provider registered for "${marketplaceId}"`);

    const decryptedSettings = this.decryptSettings(connection.settings as Record<string, unknown>);
    await provider.connect(decryptedSettings);

    // Get products to sync
    let productsToSync;
    if (productIds && productIds.length > 0) {
      productsToSync = await Promise.all(
        productIds.map((id) => this.db.query.products.findFirst({ where: eq(products.id, id) })),
      );
      productsToSync = productsToSync.filter(Boolean);
    } else {
      const result = await this.db.query.products.findMany({
        where: eq(products.status, 'active'),
      });
      productsToSync = result;
    }

    const results: Array<{ productId: string; success: boolean; error?: string }> = [];

    for (const product of productsToSync) {
      if (!product) continue;
      try {
        // Load product images from media table
        const productImages = await this.db
          .select()
          .from(media)
          .where(and(eq(media.entityType, 'product'), eq(media.entityId, product.id)))
          .orderBy(asc(media.sortOrder));

        const input: MarketplaceProductInput = {
          sku: product.sku ?? product.id,
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          currency: 'EUR',
          quantity: product.inventoryQuantity ?? 0,
          images: productImages.map((img) => img.path),
        };

        // Check if listing already exists
        const existingListing = await this.db.query.marketplaceListings.findFirst({
          where: and(
            eq(marketplaceListings.productId, product.id),
            eq(marketplaceListings.marketplaceId, marketplaceId),
          ),
        });

        if (existingListing) {
          const listing = await provider.updateListing(existingListing.externalId, input);
          await this.db
            .update(marketplaceListings)
            .set({
              status: listing.status,
              externalUrl: listing.url ?? null,
              syncedAt: new Date(),
            })
            .where(eq(marketplaceListings.id, existingListing.id));
        } else {
          const listing = await provider.listProduct(input);
          await this.db.insert(marketplaceListings).values({
            productId: product.id,
            marketplaceId,
            externalId: listing.externalId,
            externalUrl: listing.url ?? null,
            status: listing.status,
            syncedAt: new Date(),
          });
        }

        results.push({ productId: product.id, success: true });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ productId: product.id, success: false, error: errorMsg });
        logger.error({ productId: product.id, error: errorMsg }, 'Failed to sync product');
      }
    }

    // Log the sync
    await this.logSync(marketplaceId, 'product_sync', 'completed', {
      total: productsToSync.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    // Update last sync time
    await this.db
      .update(marketplaceConnections)
      .set({ lastSyncAt: new Date() })
      .where(eq(marketplaceConnections.id, connection.id));

    return results;
  }

  // ─── Order Import ─────────────────────────────────────────────────────────

  async importOrders(marketplaceId: string) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: eq(marketplaceConnections.marketplaceId, marketplaceId),
    });
    if (!connection) throw new Error(`No connection for marketplace "${marketplaceId}"`);

    const provider = this.registry.get(marketplaceId);
    if (!provider) throw new Error(`No provider registered for "${marketplaceId}"`);

    const decryptedSettings = this.decryptSettings(connection.settings as Record<string, unknown>);
    await provider.connect(decryptedSettings);

    const lastSync = connection.lastSyncAt ?? undefined;
    const orders = await provider.fetchOrders(lastSync ?? undefined);

    let imported = 0;
    let skipped = 0;

    for (const order of orders) {
      // Check if already imported
      const existing = await this.db.query.marketplaceOrders.findFirst({
        where: and(
          eq(marketplaceOrders.externalId, order.externalId),
          eq(marketplaceOrders.marketplaceId, marketplaceId),
        ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      const [insertedOrder] = await this.db
        .insert(marketplaceOrders)
        .values({
          externalId: order.externalId,
          marketplaceId,
          orderData: order as unknown as Record<string, unknown>,
          importedAt: new Date(),
        })
        .returning();

      // Auto-convert to ForkCart order
      try {
        await this.convertMarketplaceOrder(insertedOrder!.id);
      } catch (convertErr) {
        logger.error(
          {
            externalId: order.externalId,
            error: convertErr instanceof Error ? convertErr.message : 'Unknown error',
          },
          'Failed to convert marketplace order — raw import kept',
        );
      }

      await provider.acknowledgeOrder(order.externalId);
      imported++;
    }

    await this.logSync(marketplaceId, 'order_import', 'completed', {
      total: orders.length,
      imported,
      skipped,
    });

    return { total: orders.length, imported, skipped };
  }

  // ─── Order Conversion ──────────────────────────────────────────────────────

  /** Map marketplace order status → ForkCart order status */
  private mapOrderStatus(marketplaceStatus: string): string {
    const normalized = marketplaceStatus.toLowerCase().trim();
    const statusMap: Record<string, string> = {
      pending: 'pending',
      unshipped: 'pending',
      new: 'pending',
      processing: 'processing',
      shipped: 'shipped',
      delivered: 'delivered',
      completed: 'delivered',
      cancelled: 'cancelled',
      canceled: 'cancelled',
      refunded: 'refunded',
      returned: 'refunded',
    };
    return statusMap[normalized] ?? 'pending';
  }

  /** Generate a unique order number for marketplace-imported orders */
  private generateMarketplaceOrderNumber(marketplaceId: string, externalId: string): string {
    const prefix = marketplaceId.substring(0, 3).toUpperCase();
    const suffix = externalId.substring(0, 12).replace(/[^a-zA-Z0-9]/g, '');
    return `MKT-${prefix}-${suffix}`;
  }

  /**
   * Convert a raw marketplace order into a real ForkCart order.
   * Creates/matches customer, addresses, order + items, and links back.
   */
  async convertMarketplaceOrder(marketplaceOrderId: string): Promise<string> {
    const mpOrder = await this.db.query.marketplaceOrders.findFirst({
      where: eq(marketplaceOrders.id, marketplaceOrderId),
    });
    if (!mpOrder) throw new Error(`Marketplace order ${marketplaceOrderId} not found`);
    if (mpOrder.forkcartOrderId) {
      logger.info(
        { marketplaceOrderId, forkcartOrderId: mpOrder.forkcartOrderId },
        'Marketplace order already converted',
      );
      return mpOrder.forkcartOrderId;
    }

    const orderData = mpOrder.orderData as unknown as MarketplaceOrder;

    // 1. Find or create customer
    const customerId = await this.findOrCreateCustomer(orderData);

    // 2. Create shipping address
    const shippingAddr = orderData.shippingAddress;
    const [shippingAddress] = await this.db
      .insert(addresses)
      .values({
        customerId,
        firstName: shippingAddr.firstName,
        lastName: shippingAddr.lastName,
        addressLine1: shippingAddr.addressLine1,
        addressLine2: shippingAddr.addressLine2 ?? null,
        city: shippingAddr.city,
        state: shippingAddr.state ?? null,
        postalCode: shippingAddr.postalCode,
        country: shippingAddr.country,
      })
      .returning();

    // Use the same address as billing (marketplace orders typically don't separate them)
    const billingAddressId = shippingAddress!.id;
    const shippingAddressId = shippingAddress!.id;

    // 3. Calculate totals from items
    const subtotal = orderData.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = orderData.totalAmount;
    const shippingTotal = total - subtotal > 0 ? total - subtotal : 0;

    const forkcartStatus = this.mapOrderStatus(orderData.status);
    const orderNumber = this.generateMarketplaceOrderNumber(
      mpOrder.marketplaceId,
      mpOrder.externalId,
    );

    // 4. Create the ForkCart order
    const [newOrder] = await this.db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        status: forkcartStatus,
        subtotal,
        shippingTotal,
        taxTotal: 0,
        discountTotal: 0,
        total,
        currency: orderData.currency ?? 'EUR',
        shippingAddressId,
        billingAddressId,
        metadata: {
          source: 'marketplace',
          marketplaceId: mpOrder.marketplaceId,
          externalId: mpOrder.externalId,
        },
        createdAt: orderData.orderedAt ? new Date(orderData.orderedAt) : new Date(),
      })
      .returning();

    const forkcartOrderId = newOrder!.id;

    // 5. Create order items — match products by SKU where possible
    for (const item of orderData.items) {
      let productId: string | null = null;

      if (item.sku) {
        const product = await this.db.query.products.findFirst({
          where: eq(products.sku, item.sku),
        });
        if (product) productId = product.id;
      }

      // If no product found by SKU, we still create the order item with a placeholder
      // productId is required in the schema, so we need a match
      if (!productId) {
        logger.warn(
          { sku: item.sku, orderNumber, externalId: mpOrder.externalId },
          'No matching product found for marketplace order item SKU — skipping item',
        );
        continue;
      }

      await this.db.insert(orderItems).values({
        orderId: forkcartOrderId,
        productId,
        productName: item.name,
        sku: item.sku ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      });
    }

    // 6. Record status history
    await this.db.insert(orderStatusHistory).values({
      orderId: forkcartOrderId,
      fromStatus: null,
      toStatus: forkcartStatus,
      note: `Imported from ${mpOrder.marketplaceId} (${mpOrder.externalId})`,
    });

    // 7. Link marketplace order → ForkCart order
    await this.db
      .update(marketplaceOrders)
      .set({ forkcartOrderId })
      .where(eq(marketplaceOrders.id, marketplaceOrderId));

    // 8. Update customer stats
    await this.db
      .update(customers)
      .set({
        orderCount:
          (await this.db.query.customers.findFirst({ where: eq(customers.id, customerId) }))!
            .orderCount + 1,
        totalSpent:
          (await this.db.query.customers.findFirst({ where: eq(customers.id, customerId) }))!
            .totalSpent + total,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    logger.info(
      {
        marketplaceOrderId,
        forkcartOrderId,
        orderNumber,
        marketplace: mpOrder.marketplaceId,
        externalId: mpOrder.externalId,
      },
      'Marketplace order converted to ForkCart order',
    );

    return forkcartOrderId;
  }

  /** Find existing customer by email or create a new one */
  private async findOrCreateCustomer(orderData: MarketplaceOrder): Promise<string> {
    const email = orderData.customerEmail?.toLowerCase().trim();
    const addr = orderData.shippingAddress;

    // Parse customerName into first/last
    const nameParts = (orderData.customerName ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] || addr.firstName;
    const lastName = nameParts.slice(1).join(' ') || addr.lastName;

    if (email) {
      const existing = await this.db.query.customers.findFirst({
        where: eq(customers.email, email),
      });
      if (existing) return existing.id;
    }

    // Create new customer
    const customerEmail = email || `marketplace-${Date.now()}@placeholder.local`;
    const [customer] = await this.db
      .insert(customers)
      .values({
        email: customerEmail,
        firstName,
        lastName,
      })
      .returning();

    return customer!.id;
  }

  // ─── Inventory Sync ───────────────────────────────────────────────────────

  async syncInventory(marketplaceId: string) {
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: eq(marketplaceConnections.marketplaceId, marketplaceId),
    });
    if (!connection) throw new Error(`No connection for marketplace "${marketplaceId}"`);

    const provider = this.registry.get(marketplaceId);
    if (!provider) throw new Error(`No provider registered for "${marketplaceId}"`);

    const decryptedSettings = this.decryptSettings(connection.settings as Record<string, unknown>);
    await provider.connect(decryptedSettings);

    // Get all listings for this marketplace
    const listings = await this.db.query.marketplaceListings.findMany({
      where: eq(marketplaceListings.marketplaceId, marketplaceId),
    });

    const items: Array<{ sku: string; quantity: number }> = [];

    for (const listing of listings) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, listing.productId),
      });
      if (product) {
        items.push({
          sku: product.sku ?? product.id,
          quantity: product.inventoryQuantity ?? 0,
        });
      }
    }

    if (items.length > 0) {
      await provider.bulkUpdateInventory(items);
    }

    await this.logSync(marketplaceId, 'inventory_sync', 'completed', {
      itemsUpdated: items.length,
    });

    return { itemsUpdated: items.length };
  }

  // ─── Listings ─────────────────────────────────────────────────────────────

  async getListings(filters?: { marketplaceId?: string; status?: string }) {
    if (filters?.marketplaceId && filters?.status) {
      return this.db.query.marketplaceListings.findMany({
        where: and(
          eq(marketplaceListings.marketplaceId, filters.marketplaceId),
          eq(marketplaceListings.status, filters.status),
        ),
        orderBy: [desc(marketplaceListings.syncedAt)],
      });
    }
    if (filters?.marketplaceId) {
      return this.db.query.marketplaceListings.findMany({
        where: eq(marketplaceListings.marketplaceId, filters.marketplaceId),
        orderBy: [desc(marketplaceListings.syncedAt)],
      });
    }
    if (filters?.status) {
      return this.db.query.marketplaceListings.findMany({
        where: eq(marketplaceListings.status, filters.status),
        orderBy: [desc(marketplaceListings.syncedAt)],
      });
    }
    return this.db.query.marketplaceListings.findMany({
      orderBy: [desc(marketplaceListings.syncedAt)],
    });
  }

  // ─── Sync Logs ────────────────────────────────────────────────────────────

  async getSyncLogs(marketplaceId?: string, limit = 50) {
    if (marketplaceId) {
      return this.db.query.marketplaceSyncLogs.findMany({
        where: eq(marketplaceSyncLogs.marketplaceId, marketplaceId),
        orderBy: [desc(marketplaceSyncLogs.createdAt)],
        limit,
      });
    }
    return this.db.query.marketplaceSyncLogs.findMany({
      orderBy: [desc(marketplaceSyncLogs.createdAt)],
      limit,
    });
  }

  private async logSync(
    marketplaceId: string,
    action: string,
    status: string,
    details: Record<string, unknown>,
  ) {
    await this.db.insert(marketplaceSyncLogs).values({
      marketplaceId,
      action,
      status,
      details,
    });
  }
}
