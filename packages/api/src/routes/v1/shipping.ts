import { Hono } from 'hono';
import { z } from 'zod';
import type { ShippingService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

const CreateShippingMethodSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().int().min(0),
  estimatedDays: z.string().optional(),
  isActive: z.boolean().optional(),
  countries: z.array(z.string()).default([]),
  minOrderValue: z.number().int().min(0).optional(),
  freeAbove: z.number().int().min(0).optional(),
});

const UpdateShippingMethodSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  estimatedDays: z.string().optional(),
  isActive: z.boolean().optional(),
  countries: z.array(z.string()).optional(),
  minOrderValue: z.number().int().min(0).nullable().optional(),
  freeAbove: z.number().int().min(0).nullable().optional(),
});

/** Shipping method routes */
export function createShippingRoutes(shippingService: ShippingService) {
  const router = new Hono();

  /** List all active shipping methods (PUBLIC — used by checkout) */
  router.get('/methods', async (c) => {
    const methods = await shippingService.listActive();
    return c.json({ data: methods });
  });

  /** Get available shipping methods for country + cart total (PUBLIC) */
  router.get('/methods/available', async (c) => {
    const country = c.req.query('country') ?? '';
    const total = parseInt(c.req.query('total') ?? '0', 10);

    if (!country) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'country is required' } }, 400);
    }

    const methods = await shippingService.getAvailableShippingMethods(country, total);

    // Enrich with calculated cost
    const enriched = await Promise.all(
      methods.map(async (method) => {
        const cost = await shippingService.calculateShippingCost(method.id, total);
        return { ...method, calculatedPrice: cost };
      }),
    );

    return c.json({ data: enriched });
  });

  /** Get all shipping methods (Admin — includes inactive) */
  router.get('/methods/all', async (c) => {
    const methods = await shippingService.listAll();
    return c.json({ data: methods });
  });

  /** Create shipping method (admin + superadmin only) */
  router.post('/methods', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateShippingMethodSchema.parse(body);
    const method = await shippingService.create(input);
    return c.json({ data: method }, 201);
  });

  /** Update shipping method (admin + superadmin only) */
  router.put('/methods/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateShippingMethodSchema.parse(body);
    const method = await shippingService.update(id, input);
    return c.json({ data: method });
  });

  /** Delete shipping method (admin + superadmin only) */
  router.delete('/methods/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await shippingService.delete(id);
    return c.json({ success: true });
  });

  return router;
}
