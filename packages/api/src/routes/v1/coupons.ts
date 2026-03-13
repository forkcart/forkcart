import { Hono } from 'hono';
import { z } from 'zod';
import type { CouponService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

const CreateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  value: z.number().int().min(0),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  maxUsesPerCustomer: z.number().int().min(1).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  enabled: z.boolean().optional(),
});

const UpdateCouponSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']).optional(),
  value: z.number().int().min(0).optional(),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  maxUsesPerCustomer: z.number().int().min(1).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  enabled: z.boolean().optional(),
});

const ValidateCouponSchema = z.object({
  code: z.string().min(1),
  cartTotal: z.number().int().min(0),
});

const ApplyCouponSchema = z.object({
  code: z.string().min(1),
  cartTotal: z.number().int().min(0),
  customerId: z.string().uuid().optional(),
});

/** Admin coupon routes */
export function createCouponRoutes(couponService: CouponService) {
  const router = new Hono();

  /** List all coupons (admin + superadmin only) */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const data = await couponService.list();
    return c.json({ data });
  });

  /** Create coupon (admin + superadmin only) */
  router.post('/', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateCouponSchema.parse(body);
    const coupon = await couponService.create({
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    return c.json({ data: coupon }, 201);
  });

  /** Update coupon (admin + superadmin only) */
  router.put('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateCouponSchema.parse(body);
    const coupon = await couponService.update(id, {
      ...input,
      startsAt:
        input.startsAt !== undefined
          ? input.startsAt
            ? new Date(input.startsAt)
            : null
          : undefined,
      expiresAt:
        input.expiresAt !== undefined
          ? input.expiresAt
            ? new Date(input.expiresAt)
            : null
          : undefined,
    });
    return c.json({ data: coupon });
  });

  /** Delete coupon (admin + superadmin only) */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await couponService.delete(id);
    return c.json({ success: true });
  });

  return router;
}

/** Public coupon routes (storefront) */
export function createPublicCouponRoutes(couponService: CouponService) {
  const router = new Hono();

  /** Validate a coupon code */
  router.post('/validate', async (c) => {
    const body = await c.req.json();
    const { code, cartTotal } = ValidateCouponSchema.parse(body);
    const result = await couponService.validate(code, cartTotal);
    return c.json({ data: result });
  });

  /** Apply a coupon (increments usage) */
  router.post('/apply', async (c) => {
    const body = await c.req.json();
    const { code, cartTotal, customerId } = ApplyCouponSchema.parse(body);
    const result = await couponService.apply(code, cartTotal, customerId);
    return c.json({ data: result });
  });

  return router;
}
