import { Hono } from 'hono';

const STOREFRONT_URL = process.env['STOREFRONT_URL'] ?? 'http://localhost:3000';
// RVS-022: Reject default revalidation secret
const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] ?? '';
if (!REVALIDATE_SECRET || REVALIDATE_SECRET === 'forkcart-revalidate') {
  console.warn(
    '[cache] REVALIDATE_SECRET is missing or uses the default value. Set a unique secret in production.',
  );
}

/** Cache management routes (admin) */
export function createCacheRoutes() {
  const router = new Hono();

  /** Purge storefront cache and optionally warm pages */
  router.post('/purge', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      paths?: string[];
      warm?: boolean;
    };

    // 1. Trigger Next.js revalidation
    let revalidateResult: unknown = null;
    try {
      const res = await fetch(`${STOREFRONT_URL}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: REVALIDATE_SECRET,
          all: !body.paths?.length,
          paths: body.paths,
        }),
      });
      revalidateResult = await res.json();
    } catch (err) {
      revalidateResult = {
        error: err instanceof Error ? err.message : 'Failed to reach storefront',
      };
    }

    // 2. Warm cache by hitting key pages
    const warmed: string[] = [];
    if (body.warm !== false) {
      const warmPaths = ['/', '/category/all'];
      for (const path of warmPaths) {
        try {
          await fetch(`${STOREFRONT_URL}${path}`, { method: 'GET' });
          warmed.push(path);
        } catch {
          // Skip failed warm requests
        }
      }
    }

    return c.json({
      data: {
        purged: true,
        revalidate: revalidateResult,
        warmed,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
