import { Hono } from 'hono';
import { z } from 'zod';
import type { SearchService } from '@forkcart/core';

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  category: z.string().uuid().optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'])
    .default('relevance'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const SuggestionQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

const InstantQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

const TrackSchema = z.object({
  productId: z.string().uuid(),
  eventType: z.enum(['view', 'click', 'cart_add', 'purchase']),
  sessionId: z.string().optional(),
  query: z.string().max(200).optional(),
});

const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const ZeroResultsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const RankingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Public search routes (no auth required) */
export function createSearchRoutes(searchService: SearchService) {
  const router = new Hono();

  /** Full-text product search */
  router.get('/', async (c) => {
    const query = c.req.query();
    const params = SearchQuerySchema.parse(query);

    const result = await searchService.search(params.q, {
      category: params.category,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      sort: params.sort,
      limit: params.limit,
      offset: params.offset,
      sessionId: c.req.header('X-Session-Id') ?? undefined,
    });

    return c.json({
      data: result.data,
      pagination: {
        total: result.total,
        limit: params.limit,
        offset: params.offset,
        totalPages: Math.ceil(result.total / params.limit),
      },
      meta: {
        query: result.query,
        mode: result.mode,
        suggestions: result.suggestions,
      },
    });
  });

  /** Autocomplete suggestions */
  router.get('/suggestions', async (c) => {
    const query = c.req.query();
    const params = SuggestionQuerySchema.parse(query);
    const suggestions = await searchService.getSuggestions(params.q);
    return c.json({ data: suggestions });
  });

  /** Popular searches */
  router.get('/popular', async (c) => {
    const popular = await searchService.getPopularSearches(10);
    return c.json({ data: popular });
  });

  return router;
}

/** Admin search analytics routes (auth required) */
export function createSearchAdminRoutes(searchService: SearchService) {
  const router = new Hono();

  /** Search analytics overview */
  router.get('/analytics', async (c) => {
    const query = c.req.query();
    const params = AnalyticsQuerySchema.parse(query);
    const analytics = await searchService.getAnalytics(params.days);
    return c.json({ data: analytics });
  });

  /** Zero-result searches */
  router.get('/zero-results', async (c) => {
    const query = c.req.query();
    const params = ZeroResultsQuerySchema.parse(query);
    const results = await searchService.getZeroResultSearches(params.limit, params.days);
    return c.json({ data: results });
  });

  /** CTR per search query */
  router.get('/analytics/ctr', async (c) => {
    const query = c.req.query();
    const params = AnalyticsQuerySchema.parse(query);
    const data = await searchService.getQueryCTR(params.days);
    return c.json({ data });
  });

  /** Top clicked products from search */
  router.get('/analytics/top-products', async (c) => {
    const query = c.req.query();
    const params = AnalyticsQuerySchema.parse(query);
    const data = await searchService.getTopClickedProducts(params.days);
    return c.json({ data });
  });

  /** Query → Product click mapping */
  router.get('/analytics/query-products', async (c) => {
    const query = c.req.query();
    const params = AnalyticsQuerySchema.parse(query);
    const data = await searchService.getQueryProductMap(params.days);
    return c.json({ data });
  });

  /** Product ranking scores with breakdown */
  router.get('/analytics/rankings', async (c) => {
    const query = c.req.query();
    const params = RankingsQuerySchema.parse(query);
    const data = await searchService.getProductRankingScores(params.limit);
    return c.json({ data });
  });

  return router;
}

/** Public search routes (no auth required) — mounted at /api/v1/public/search */
export function createPublicSearchRoutes(searchService: SearchService) {
  const router = new Hono();

  /** Instant search — fast, lightweight results for overlay */
  router.get('/instant', async (c) => {
    const query = c.req.query();
    const params = InstantQuerySchema.parse(query);
    const results = await searchService.instantSearch(params.q);
    return c.json({ data: results });
  });

  /** Popular search terms */
  router.get('/popular', async (c) => {
    const popular = await searchService.getPopularSearches(10);
    return c.json({ data: popular });
  });

  /** Trending products */
  router.get('/trending', async (c) => {
    const trending = await searchService.getTrendingProducts(10);
    return c.json({ data: trending });
  });

  /** Track product impressions (view, click, cart_add) + optional search query log */
  router.post('/track', async (c) => {
    const body = await c.req.json();
    const params = TrackSchema.parse(body);
    await searchService.trackImpression(params);

    // If a query was provided (user clicked a product from search), log it as a completed search
    if (params.query?.trim() && params.eventType === 'click') {
      await searchService.logSearchWithClick(
        params.query.trim(),
        params.productId,
        params.sessionId,
      );
    }

    return c.json({ ok: true });
  });

  return router;
}
