import { Hono } from 'hono';
import { z } from 'zod';
import type { ProductReviewService, CustomerAuthService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';
import { createCustomerAuthMiddleware } from '../../middleware/customer-auth';
import { requireRole } from '../../middleware/permissions';

const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().max(5000).optional(),
});

/** Public review routes — mounted under /products/:id/reviews */
export function createProductReviewRoutes(
  reviewService: ProductReviewService,
  customerAuthService: CustomerAuthService,
) {
  const router = new Hono();
  const requireAuth = createCustomerAuthMiddleware(customerAuthService);

  /** Get approved reviews for a product (public) */
  router.get('/:productId/reviews', async (c) => {
    const productId = c.req.param('productId') as string;
    const reviews = await reviewService.listByProduct(productId, { status: 'approved' });
    const rating = await reviewService.getAverageRating(productId);
    return c.json({ data: { reviews, averageRating: rating.average, reviewCount: rating.count } });
  });

  /** Submit a review (customer auth required) */
  router.post('/:productId/reviews', requireAuth, async (c) => {
    const productId = c.req.param('productId') as string;
    const customer = c.get('customer');
    const body = await c.req.json();
    const input = CreateReviewSchema.parse(body);

    const review = await reviewService.create({
      productId,
      customerId: customer.id,
      rating: input.rating,
      title: input.title ?? null,
      content: input.content ?? null,
    });

    return c.json({ data: review }, 201);
  });

  return router;
}

/** Admin review routes */
export function createAdminReviewRoutes(reviewService: ProductReviewService) {
  const router = new Hono();

  /** List all reviews (admin) */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const status = c.req.query('status');
    const reviews = await reviewService.listAll(status ? { status } : undefined);
    return c.json({ data: reviews });
  });

  /** Approve a review */
  router.put('/:id/approve', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const review = await reviewService.approve(id);
    return c.json({ data: review });
  });

  /** Reject a review */
  router.put('/:id/reject', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const review = await reviewService.reject(id);
    return c.json({ data: review });
  });

  /** Delete a review */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await reviewService.delete(id);
    return c.json({ success: true });
  });

  return router;
}
