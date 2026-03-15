import { Hono } from 'hono';
import type { VariantService, AttributeService } from '@forkcart/core';

/** Public variant routes (no auth) — mounted under /public/products */
export function createPublicVariantRoutes(
  variantService: VariantService,
  attributeService: AttributeService,
) {
  const router = new Hono();

  /** Get variants for a product (public) */
  router.get('/:productId/variants', async (c) => {
    const productId = c.req.param('productId') as string;
    const variants = await variantService.listByProduct(productId);
    return c.json({ data: variants });
  });

  /** Get all attributes (public) */
  router.get('/attributes', async (c) => {
    const attributes = await attributeService.listAll();
    return c.json({ data: attributes });
  });

  return router;
}
