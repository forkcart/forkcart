/**
 * Automatic storefront cache invalidation.
 *
 * When admin changes products, pages, categories, or theme settings,
 * this fires a non-blocking revalidation request to the storefront
 * and optionally warms the affected pages.
 */

const STOREFRONT_URL = process.env['STOREFRONT_URL'] ?? 'http://localhost:3000';
// RVS-022: Reject default revalidation secret
const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] ?? '';
if (!REVALIDATE_SECRET || REVALIDATE_SECRET === 'forkcart-revalidate') {
  console.warn(
    '[cache-invalidation] REVALIDATE_SECRET is missing or uses the default value. Cache invalidation may fail.',
  );
}

/** Debounce: don't fire more than once per 2 seconds */
let pendingPaths = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

type EntityType =
  | 'product'
  | 'category'
  | 'page'
  | 'theme'
  | 'menu'
  | 'coupon'
  | 'media'
  | 'translation';

/** Map entity types to storefront paths that need revalidation */
function getPathsForEntity(type: EntityType, slug?: string): string[] {
  switch (type) {
    case 'product':
      return [
        '/', // homepage might show products
        '/category/all',
        ...(slug ? [`/product/${slug}`] : []),
      ];
    case 'category':
      return ['/', '/category/all', ...(slug ? [`/category/${slug}`] : [])];
    case 'page':
      return [...(slug ? [`/p/${slug}`] : []), '/'];
    case 'theme':
      // Theme changes affect every page (CSS variables in root layout)
      return ['__all__'];
    case 'menu':
      return ['__all__'];
    case 'coupon':
      return ['/cart', '/checkout'];
    case 'media':
      return []; // media alone doesn't need revalidation
    case 'translation':
      return ['__all__'];
    default:
      return ['/'];
  }
}

/** Queue cache invalidation (debounced, non-blocking) */
export function invalidateCache(type: EntityType, slug?: string): void {
  const paths = getPathsForEntity(type, slug);
  for (const p of paths) pendingPaths.add(p);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushInvalidation, DEBOUNCE_MS);
}

/** Flush all pending invalidations to the storefront */
async function flushInvalidation(): Promise<void> {
  const paths = [...pendingPaths];
  pendingPaths = new Set();
  debounceTimer = null;

  const isAll = paths.includes('__all__');
  const filteredPaths = paths.filter((p) => p !== '__all__');

  try {
    // 1. Purge cache
    const res = await fetch(`${STOREFRONT_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: REVALIDATE_SECRET,
        all: isAll,
        paths: isAll ? undefined : filteredPaths,
      }),
    });

    if (!res.ok) {
      console.error(`[cache] Revalidation failed: ${res.status} ${res.statusText}`);
      return;
    }

    const result = (await res.json()) as { revalidated?: string[] };
    console.log(
      `[cache] Purged ${isAll ? 'ALL' : (result.revalidated ?? filteredPaths).length + ' paths'}`,
    );

    // 2. Warm key pages (non-blocking)
    const warmPaths = isAll ? ['/', '/category/all'] : filteredPaths.slice(0, 5);
    for (const path of warmPaths) {
      fetch(`${STOREFRONT_URL}${path}`, { method: 'GET' }).catch(() => {
        /* fire-and-forget warm */
      });
    }
  } catch (err) {
    console.error(`[cache] Failed to reach storefront:`, err instanceof Error ? err.message : err);
  }
}
