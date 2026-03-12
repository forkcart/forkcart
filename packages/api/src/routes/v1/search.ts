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

const AnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const ZeroResultsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  days: z.coerce.number().int().min(1).max(365).default(30),
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

  return router;
}
