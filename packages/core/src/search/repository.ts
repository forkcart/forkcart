import { eq, sql, desc, and, gte, lte, count, ilike, or } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { searchQueries, products, productCategories, categories } from '@forkcart/database/schemas';

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  status: string;
  inventoryQuantity: number;
  createdAt: Date;
  rank: number;
}

export interface SearchFilters {
  query: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  limit?: number;
  offset?: number;
}

export interface SearchQueryRecord {
  id: string;
  query: string;
  resultsCount: number;
  clickedProductId: string | null;
  sessionId: string | null;
  customerId: string | null;
  searchMode: string;
  createdAt: Date;
}

export interface PopularSearch {
  query: string;
  searchCount: number;
}

export interface ZeroResultSearch {
  query: string;
  searchCount: number;
  lastSearched: Date;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgResultsCount: number;
  clickThroughRate: number;
  topQueries: Array<{ query: string; searchCount: number; avgResults: number }>;
  zeroResultQueries: ZeroResultSearch[];
}

/** Repository for search queries and full-text product search */
export class SearchRepository {
  constructor(private readonly db: Database) {}

  /**
   * Full-text search on products using PostgreSQL ts_vector with fallback to ILIKE.
   * Weights: Name (A) > SKU (B) > Description (C)
   */
  async searchProducts(filters: SearchFilters): Promise<{ data: SearchResult[]; total: number }> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    const queryText = filters.query.trim();

    if (!queryText) {
      return { data: [], total: 0 };
    }

    // Build ts_query — split words, join with & for AND matching
    const tsQueryWords = queryText
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => `${w}:*`)
      .join(' & ');

    // Weighted ts_vector: name=A, sku=B, description=C
    const tsVector = sql`(
      setweight(to_tsvector('german', coalesce(${products.name}, '')), 'A') ||
      setweight(to_tsvector('german', coalesce(${products.sku}, '')), 'B') ||
      setweight(to_tsvector('german', coalesce(${products.description}, '')), 'C')
    )`;

    const tsQuery = sql`to_tsquery('german', ${tsQueryWords})`;

    // Rank by ts_rank + ILIKE boost
    const rankExpr = sql<number>`(
      ts_rank(${tsVector}, ${tsQuery}) +
      CASE WHEN ${products.name} ILIKE ${'%' + queryText + '%'} THEN 0.5 ELSE 0 END +
      CASE WHEN ${products.sku} ILIKE ${'%' + queryText + '%'} THEN 0.3 ELSE 0 END
    )`.as('rank');

    // Combine full-text match OR ILIKE fallback (for partial/typo matches)
    const textCondition = or(
      sql`${tsVector} @@ ${tsQuery}`,
      ilike(products.name, `%${queryText}%`),
      ilike(products.description, `%${queryText}%`),
      ilike(products.sku, `%${queryText}%`),
    );

    // Build additional filters
    const conditions = [textCondition, eq(products.status, 'active')];

    if (filters.priceMin !== undefined) {
      conditions.push(gte(products.price, filters.priceMin));
    }
    if (filters.priceMax !== undefined) {
      conditions.push(lte(products.price, filters.priceMax));
    }

    let whereClause = and(...conditions);

    // Category filter via subquery
    if (filters.categoryId) {
      const categoryCondition = sql`${products.id} IN (
        SELECT ${productCategories.productId} FROM ${productCategories}
        WHERE ${productCategories.categoryId} = ${filters.categoryId}
      )`;
      whereClause = and(whereClause, categoryCondition);
    }

    // Sort order
    let orderBy;
    switch (filters.sort) {
      case 'price_asc':
        orderBy = sql`${products.price} ASC`;
        break;
      case 'price_desc':
        orderBy = sql`${products.price} DESC`;
        break;
      case 'name_asc':
        orderBy = sql`${products.name} ASC`;
        break;
      case 'name_desc':
        orderBy = sql`${products.name} DESC`;
        break;
      case 'newest':
        orderBy = sql`${products.createdAt} DESC`;
        break;
      default:
        orderBy = sql`rank DESC`;
    }

    const [dataRows, totalResult] = await Promise.all([
      this.db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          shortDescription: products.shortDescription,
          sku: products.sku,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          currency: products.currency,
          status: products.status,
          inventoryQuantity: products.inventoryQuantity,
          createdAt: products.createdAt,
          rank: rankExpr,
        })
        .from(products)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(products).where(whereClause),
    ]);

    return {
      data: dataRows.map((r) => ({
        ...r,
        rank: Number(r.rank) || 0,
      })),
      total: totalResult[0]?.count ?? 0,
    };
  }

  /** Get autocomplete suggestions based on product names, categories, and popular searches */
  async getSuggestions(partial: string, maxResults = 5): Promise<string[]> {
    const term = partial.trim();
    if (!term) return [];

    // Product name suggestions
    const productSuggestions = await this.db
      .selectDistinct({ name: products.name })
      .from(products)
      .where(and(ilike(products.name, `%${term}%`), eq(products.status, 'active')))
      .limit(maxResults);

    // Category name suggestions
    const categorySuggestions = await this.db
      .selectDistinct({ name: categories.name })
      .from(categories)
      .where(and(ilike(categories.name, `%${term}%`), eq(categories.isActive, true)))
      .limit(3);

    // Popular search term suggestions
    const popularSuggestions = await this.db
      .select({
        query: searchQueries.query,
        searchCount: count().as('search_count'),
      })
      .from(searchQueries)
      .where(and(ilike(searchQueries.query, `%${term}%`), gte(searchQueries.resultsCount, 1)))
      .groupBy(searchQueries.query)
      .orderBy(desc(sql`search_count`))
      .limit(3);

    // Merge and deduplicate, prioritize: popular > products > categories
    const seen = new Set<string>();
    const results: string[] = [];

    for (const row of popularSuggestions) {
      const normalized = row.query.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push(row.query);
      }
    }
    for (const row of productSuggestions) {
      const normalized = row.name.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push(row.name);
      }
    }
    for (const row of categorySuggestions) {
      const normalized = row.name.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push(row.name);
      }
    }

    return results.slice(0, maxResults);
  }

  /** Log a search query for analytics */
  async logSearch(params: {
    query: string;
    resultsCount: number;
    sessionId?: string;
    customerId?: string;
    searchMode?: string;
  }): Promise<void> {
    await this.db.insert(searchQueries).values({
      query: params.query,
      resultsCount: params.resultsCount,
      sessionId: params.sessionId ?? null,
      customerId: params.customerId ?? null,
      searchMode: params.searchMode ?? 'basic',
    });
  }

  /** Log a click on a search result */
  async logClick(searchId: string, productId: string): Promise<void> {
    await this.db
      .update(searchQueries)
      .set({ clickedProductId: productId })
      .where(eq(searchQueries.id, searchId));
  }

  /** Get popular searches (top N by count) */
  async getPopularSearches(limit = 10, daysBack = 30): Promise<PopularSearch[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const rows = await this.db
      .select({
        query: searchQueries.query,
        searchCount: count().as('search_count'),
      })
      .from(searchQueries)
      .where(and(gte(searchQueries.createdAt, since), gte(searchQueries.resultsCount, 1)))
      .groupBy(searchQueries.query)
      .orderBy(desc(sql`search_count`))
      .limit(limit);

    return rows.map((r) => ({
      query: r.query,
      searchCount: Number(r.searchCount),
    }));
  }

  /** Get searches that returned zero results */
  async getZeroResultSearches(limit = 50, daysBack = 30): Promise<ZeroResultSearch[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const rows = await this.db
      .select({
        query: searchQueries.query,
        searchCount: count().as('search_count'),
        lastSearched: sql<Date>`max(${searchQueries.createdAt})`.as('last_searched'),
      })
      .from(searchQueries)
      .where(and(gte(searchQueries.createdAt, since), eq(searchQueries.resultsCount, 0)))
      .groupBy(searchQueries.query)
      .orderBy(desc(sql`search_count`))
      .limit(limit);

    return rows.map((r) => ({
      query: r.query,
      searchCount: Number(r.searchCount),
      lastSearched: r.lastSearched,
    }));
  }

  /** Get search analytics for admin dashboard */
  async getAnalytics(daysBack = 30): Promise<SearchAnalytics> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const timeFilter = gte(searchQueries.createdAt, since);

    const [totals, uniqueQ, topQueries, zeroResults] = await Promise.all([
      // Total searches + avg results + CTR
      this.db
        .select({
          totalSearches: count().as('total'),
          avgResults: sql<number>`coalesce(avg(${searchQueries.resultsCount}), 0)`.as(
            'avg_results',
          ),
          clickedCount: sql<number>`count(${searchQueries.clickedProductId})`.as('clicked'),
        })
        .from(searchQueries)
        .where(timeFilter),

      // Unique queries
      this.db
        .select({ count: sql<number>`count(DISTINCT ${searchQueries.query})`.as('cnt') })
        .from(searchQueries)
        .where(timeFilter),

      // Top queries
      this.db
        .select({
          query: searchQueries.query,
          searchCount: count().as('search_count'),
          avgResults: sql<number>`coalesce(avg(${searchQueries.resultsCount}), 0)`.as(
            'avg_results',
          ),
        })
        .from(searchQueries)
        .where(timeFilter)
        .groupBy(searchQueries.query)
        .orderBy(desc(sql`search_count`))
        .limit(20),

      // Zero-result queries
      this.getZeroResultSearches(20, daysBack),
    ]);

    const total = Number(totals[0]?.totalSearches ?? 0);
    const clicked = Number(totals[0]?.clickedCount ?? 0);

    return {
      totalSearches: total,
      uniqueQueries: Number(uniqueQ[0]?.count ?? 0),
      avgResultsCount: Number(totals[0]?.avgResults ?? 0),
      clickThroughRate: total > 0 ? clicked / total : 0,
      topQueries: topQueries.map((r) => ({
        query: r.query,
        searchCount: Number(r.searchCount),
        avgResults: Number(r.avgResults),
      })),
      zeroResultQueries: zeroResults,
    };
  }
}
