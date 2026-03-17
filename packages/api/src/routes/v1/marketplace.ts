import { Hono } from 'hono';
import { z } from 'zod';
import type { MarketplaceService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

const CreateConnectionSchema = z.object({
  marketplaceId: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  settings: z.record(z.unknown()).default({}),
});

const UpdateConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
});

const SyncProductsSchema = z.object({
  marketplaceId: z.string().min(1),
  productIds: z.array(z.string().uuid()).optional(),
});

const SyncOrdersSchema = z.object({
  marketplaceId: z.string().min(1),
});

const SyncInventorySchema = z.object({
  marketplaceId: z.string().min(1),
});

/** Marketplace routes (admin only) */
export function createMarketplaceRoutes(marketplaceService: MarketplaceService) {
  const router = new Hono();

  // All marketplace routes require admin
  router.use('*', requireRole('admin', 'superadmin'));

  // ─── Connections ──────────────────────────────────────────────────────────

  /** List all marketplace connections */
  router.get('/connections', async (c) => {
    const connections = await marketplaceService.getConnections();
    return c.json({ data: connections });
  });

  /** Create a new marketplace connection */
  router.post('/connections', async (c) => {
    const body = await c.req.json();
    const input = CreateConnectionSchema.parse(body);
    const connection = await marketplaceService.saveConnection(input);
    return c.json({ data: connection }, 201);
  });

  /** Update a marketplace connection */
  router.put('/connections/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateConnectionSchema.parse(body);
    const connection = await marketplaceService.updateConnection(id, input);
    if (!connection) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Connection not found' } }, 404);
    }
    return c.json({ data: connection });
  });

  /** Delete a marketplace connection */
  router.delete('/connections/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await marketplaceService.deleteConnection(id);
    return c.json({ success: true });
  });

  /** Test a marketplace connection */
  router.post('/connections/:id/test', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const result = await marketplaceService.testConnection(id);
    return c.json({ data: result });
  });

  // ─── Sync Operations ─────────────────────────────────────────────────────

  /** Trigger product sync */
  router.post('/sync/products', async (c) => {
    const body = await c.req.json();
    const input = SyncProductsSchema.parse(body);
    const results = await marketplaceService.syncProducts(input.marketplaceId, input.productIds);
    return c.json({ data: results });
  });

  /** Trigger order import */
  router.post('/sync/orders', async (c) => {
    const body = await c.req.json();
    const input = SyncOrdersSchema.parse(body);
    const results = await marketplaceService.importOrders(input.marketplaceId);
    return c.json({ data: results });
  });

  /** Trigger inventory sync */
  router.post('/sync/inventory', async (c) => {
    const body = await c.req.json();
    const input = SyncInventorySchema.parse(body);
    const results = await marketplaceService.syncInventory(input.marketplaceId);
    return c.json({ data: results });
  });

  // ─── Listings & Logs ──────────────────────────────────────────────────────

  /** List all marketplace listings */
  router.get('/listings', async (c) => {
    const marketplaceId = c.req.query('marketplaceId');
    const status = c.req.query('status');
    const listings = await marketplaceService.getListings({
      marketplaceId: marketplaceId || undefined,
      status: status || undefined,
    });
    return c.json({ data: listings });
  });

  /** Get sync logs */
  router.get('/sync-logs', async (c) => {
    const marketplaceId = c.req.query('marketplaceId');
    const limit = parseInt(c.req.query('limit') ?? '50', 10);
    const logs = await marketplaceService.getSyncLogs(marketplaceId || undefined, limit);
    return c.json({ data: logs });
  });

  return router;
}
