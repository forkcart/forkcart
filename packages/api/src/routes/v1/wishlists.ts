import { Hono } from 'hono';
import { z } from 'zod';
import type { WishlistService, ProductService, CustomerAuthService } from '@forkcart/core';
import { createCustomerAuthMiddleware } from '../../middleware/customer-auth';

const productIdSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
});

/** Wishlist routes — customer auth required */
export function createWishlistRoutes(
  wishlistService: WishlistService,
  productService: ProductService,
  customerAuthService: CustomerAuthService,
) {
  const router = new Hono();
  const requireAuth = createCustomerAuthMiddleware(customerAuthService);

  /** Get customer wishlist with product details */
  router.get('/', requireAuth, async (c) => {
    const customer = c.get('customer');
    const items = await wishlistService.list(customer.id);

    // Fetch product details for each item
    const products = [];
    for (const item of items) {
      try {
        const product = await productService.getById(item.productId);
        products.push({
          ...item,
          product,
        });
      } catch {
        // Product may have been deleted
      }
    }

    return c.json({ data: products });
  });

  /** Toggle product in wishlist */
  router.post('/:productId', requireAuth, async (c) => {
    const customer = c.get('customer');
    const { productId } = productIdSchema.parse({ productId: c.req.param('productId') });
    const result = await wishlistService.toggle(customer.id, productId);
    return c.json({ data: result });
  });

  /** Remove product from wishlist */
  router.delete('/:productId', requireAuth, async (c) => {
    const customer = c.get('customer');
    const { productId } = productIdSchema.parse({ productId: c.req.param('productId') });
    await wishlistService.toggle(customer.id, productId);
    return c.json({ data: { removed: true } });
  });

  return router;
}
