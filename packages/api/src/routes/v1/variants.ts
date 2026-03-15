import { Hono } from 'hono';
import { z } from 'zod';
import type { VariantService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';

const CreateVariantSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  price: z.number().int().nullable().optional(),
  inventoryQuantity: z.number().int().min(0).default(0),
  attributes: z.record(z.string()).default({}),
  sortOrder: z.number().int().default(0),
});

const UpdateVariantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().max(100).nullable().optional(),
  price: z.number().int().nullable().optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  attributes: z.record(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

const GenerateVariantsSchema = z.object({
  attributeSelections: z.array(
    z.object({
      name: z.string().min(1),
      values: z.array(z.string().min(1)).min(1),
    }),
  ),
});

const BulkUpdateSchema = z.object({
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      sku: z.string().max(100).nullable().optional(),
      price: z.number().int().nullable().optional(),
      inventoryQuantity: z.number().int().min(0).optional(),
      attributes: z.record(z.string()).optional(),
      sortOrder: z.number().int().optional(),
    }),
  ),
});

/** Product Variant routes — mounted under /products/:productId/variants */
export function createVariantRoutes(variantService: VariantService) {
  const router = new Hono();

  /** List variants for a product */
  router.get('/:productId/variants', async (c) => {
    const productId = c.req.param('productId') as string;
    const variants = await variantService.listByProduct(productId);
    return c.json({ data: variants });
  });

  /** Get single variant */
  router.get('/:productId/variants/:variantId', async (c) => {
    const { id: variantId } = IdParamSchema.parse({ id: c.req.param('variantId') });
    const variant = await variantService.getById(variantId);
    return c.json({ data: variant });
  });

  /** Create variant */
  router.post('/:productId/variants', async (c) => {
    const productId = c.req.param('productId') as string;
    const body = await c.req.json();
    const input = CreateVariantSchema.parse(body);

    const variant = await variantService.create({ ...input, productId });
    return c.json({ data: variant }, 201);
  });

  /** Bulk update variants */
  router.put('/:productId/variants/bulk', async (c) => {
    const body = await c.req.json();
    const { variants } = BulkUpdateSchema.parse(body);

    const results = [];
    for (const v of variants) {
      const { id, ...data } = v;
      const updated = await variantService.update(id, data);
      results.push(updated);
    }
    return c.json({ data: results });
  });

  /** Generate variants from attribute combinations */
  router.post('/:productId/variants/generate', async (c) => {
    const productId = c.req.param('productId') as string;
    const body = await c.req.json();
    const input = GenerateVariantsSchema.parse(body);

    const variants = await variantService.generateVariants(productId, input.attributeSelections);
    return c.json({ data: variants }, 201);
  });

  /** Update variant */
  router.put('/:productId/variants/:variantId', async (c) => {
    const { id: variantId } = IdParamSchema.parse({ id: c.req.param('variantId') });
    const body = await c.req.json();
    const input = UpdateVariantSchema.parse(body);

    const variant = await variantService.update(variantId, input);
    return c.json({ data: variant });
  });

  /** Delete variant */
  router.delete('/:productId/variants/:variantId', async (c) => {
    const { id: variantId } = IdParamSchema.parse({ id: c.req.param('variantId') });
    await variantService.delete(variantId);
    return c.json({ success: true });
  });

  /** Delete all variants for a product */
  router.delete('/:productId/variants', async (c) => {
    const productId = c.req.param('productId') as string;
    await variantService.deleteByProductId(productId);
    return c.json({ success: true });
  });

  return router;
}
