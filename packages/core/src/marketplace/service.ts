import { eq, desc, and } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import {
  marketplaceConnections,
  marketplaceListings,
  marketplaceOrders,
  marketplaceSyncLogs,
} from '@forkcart/database/schemas';
import { products } from '@forkcart/database/schemas';
import type { MarketplaceProviderRegistry } from './registry';
import type { MarketplaceProductInput } from './types';
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
        const input: MarketplaceProductInput = {
          sku: product.sku ?? product.id,
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          currency: 'EUR',
          quantity: product.inventoryQuantity ?? 0,
          images: [], // TODO: load product images
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

      await this.db.insert(marketplaceOrders).values({
        externalId: order.externalId,
        marketplaceId,
        orderData: order as unknown as Record<string, unknown>,
        importedAt: new Date(),
      });

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
