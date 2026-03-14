import type { MiddlewareHandler } from 'hono';
import { invalidateCache } from '../lib/cache-invalidation.js';

type EntityType = Parameters<typeof invalidateCache>[0];

/** Route pattern → entity type mapping */
const ROUTE_ENTITY_MAP: Array<{ pattern: RegExp; entity: EntityType }> = [
  { pattern: /\/products(\/|$)/, entity: 'product' },
  { pattern: /\/product-translations(\/|$)/, entity: 'translation' },
  { pattern: /\/product-images(\/|$)/, entity: 'product' },
  { pattern: /\/categories(\/|$)/, entity: 'category' },
  { pattern: /\/pages(\/|$)/, entity: 'page' },
  { pattern: /\/theme-settings(\/|$)/, entity: 'theme' },
  { pattern: /\/coupons(\/|$)/, entity: 'coupon' },
  { pattern: /\/translations(\/|$)/, entity: 'translation' },
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware that automatically invalidates storefront cache
 * after successful mutating requests (POST/PUT/PATCH/DELETE).
 */
export function autoCacheInvalidation(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only invalidate on successful mutations
    if (!MUTATING_METHODS.has(c.req.method)) return;
    if (c.res.status >= 400) return;

    const path = c.req.path;
    const match = ROUTE_ENTITY_MAP.find((r) => r.pattern.test(path));
    if (!match) return;

    // Try to extract slug from response for targeted invalidation
    let slug: string | undefined;
    try {
      const cloned = c.res.clone();
      const body = (await cloned.json()) as { data?: { slug?: string } };
      slug = body?.data?.slug;
    } catch {
      // Response might not be JSON — that's fine
    }

    invalidateCache(match.entity, slug);
  };
}
