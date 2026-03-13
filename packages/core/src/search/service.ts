import type {
  SearchRepository,
  SearchFilters,
  SearchResult,
  QueryCTR,
  TopClickedProduct,
  QueryProductMapping,
} from './repository';
import type { RankingService, TrendingProduct, ProductScore } from './ranking';
import type { EventBus } from '../plugins/event-bus';
import type { Database } from '@forkcart/database';
import { SEARCH_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('search-service');

/** AI service interface — matches @forkcart/ai AIService shape */
interface AITextGenerator {
  generateText(options: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string }>;
}

/** Options for the main search method */
export interface SearchOptions {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  limit?: number;
  offset?: number;
  sessionId?: string;
  customerId?: string;
}

/** Instant search result — lightweight for overlay */
export interface InstantSearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  imageUrl: string | null;
  hasDiscount: boolean;
}

/** Enhanced query result from AI parsing */
interface EnhancedQuery {
  keywords: string[];
  priceMin?: number;
  priceMax?: number;
  category?: string;
}

/** Search mode: basic (always), enhanced (with AI), semantic (future) */
export type SearchMode = 'basic' | 'enhanced' | 'semantic';

/** Semantic search provider interface — placeholder for future vector search */
export interface SemanticSearchProvider {
  searchByEmbedding(query: string, limit: number): Promise<Array<{ id: string; score: number }>>;
}

/** Dependencies for SearchService */
export interface SearchServiceDeps {
  searchRepository: SearchRepository;
  rankingService?: RankingService | null;
  eventBus: EventBus;
  aiService?: AITextGenerator | null;
  semanticProvider?: SemanticSearchProvider | null;
  mediaBaseUrl?: string;
  db?: Database;
}

/** Search result with metadata */
export interface SearchResponse {
  data: SearchResult[];
  total: number;
  query: string;
  mode: SearchMode;
  suggestions?: string[];
}

/**
 * Search service — orchestrates basic, AI-enhanced, and (future) semantic search.
 * Always falls back to basic mode if AI is unavailable.
 */
export class SearchService {
  private readonly repo: SearchRepository;
  private readonly ranking: RankingService | null;
  private readonly events: EventBus;
  private readonly ai: AITextGenerator | null;
  private readonly mediaBaseUrl: string;
  private readonly db: Database | null;

  constructor(deps: SearchServiceDeps) {
    this.repo = deps.searchRepository;
    this.ranking = deps.rankingService ?? null;
    this.events = deps.eventBus;
    this.ai = deps.aiService ?? null;
    this.mediaBaseUrl = deps.mediaBaseUrl ?? '';
    this.db = deps.db ?? null;
    // semanticProvider reserved for future vector search (deps.semanticProvider)
  }

  /** Resolve a media path to a full URL */
  private resolveImageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${this.mediaBaseUrl}/uploads${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /** Get translated product names for a list of product IDs (default locale) */
  private async getTranslatedNames(productIds: string[]): Promise<Map<string, string>> {
    if (!this.db || productIds.length === 0) return new Map();
    try {
      const { sql: dsql } = await import('drizzle-orm');
      // Get default locale
      const [langRow] = await this.db.execute<{ locale: string }>(
        dsql`SELECT locale FROM languages WHERE is_default = true LIMIT 1`,
      );
      if (!langRow) return new Map();
      const locale = langRow.locale;

      const rows = await this.db.execute<{ product_id: string; name: string }>(
        dsql`SELECT product_id, name FROM product_translations
             WHERE locale = ${locale}
             AND product_id::text = ANY(ARRAY[${dsql.join(
               productIds.map((id) => dsql`${id}`),
               dsql`, `,
             )}])`,
      );
      const map = new Map<string, string>();
      for (const row of rows) {
        if (row.name) map.set(row.product_id, row.name);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  /** Main search method — tries enhanced mode first, falls back to basic */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { data: [], total: 0, query: trimmed, mode: 'basic' };
    }

    let mode: SearchMode = 'basic';
    let filters: SearchFilters = {
      query: trimmed,
      categoryId: options.category,
      priceMin: options.priceMin,
      priceMax: options.priceMax,
      sort: options.sort,
      limit: options.limit,
      offset: options.offset,
    };

    // Try AI-enhanced mode
    if (this.ai) {
      try {
        const enhanced = await this.enhanceQuery(trimmed);
        mode = 'enhanced';

        // Merge AI-parsed filters with explicit options (explicit wins)
        filters = {
          ...filters,
          query: enhanced.keywords.join(' ') || trimmed,
          priceMin: options.priceMin ?? enhanced.priceMin,
          priceMax: options.priceMax ?? enhanced.priceMax,
          categoryId: options.category ?? enhanced.category,
        };

        logger.info({ original: trimmed, enhanced }, 'AI-enhanced query');
      } catch (error) {
        logger.warn({ error }, 'AI enhancement failed, falling back to basic');
        mode = 'basic';
      }
    }

    // Execute search
    const result = await this.repo.searchProducts(filters);

    // Log search asynchronously (fire-and-forget)
    this.repo
      .logSearch({
        query: trimmed,
        resultsCount: result.total,
        sessionId: options.sessionId,
        customerId: options.customerId,
        searchMode: mode,
      })
      .catch((err) => logger.error({ err }, 'Failed to log search'));

    // Emit event
    this.events
      .emit(SEARCH_EVENTS.SEARCH_PERFORMED, {
        query: trimmed,
        mode,
        resultsCount: result.total,
      })
      .catch(() => {});

    // Apply smart ranking when sorting by relevance
    let rankedData = result.data;
    if (this.ranking && (!filters.sort || filters.sort === 'relevance') && result.data.length > 0) {
      try {
        const productIds = result.data.map((p) => p.id);
        const scores = await this.ranking.calculateScores(productIds);
        rankedData = result.data
          .map((p) => ({
            ...p,
            rank: p.rank * (scores.get(p.id) ?? 1),
          }))
          .sort((a, b) => b.rank - a.rank);
      } catch (err) {
        logger.warn({ err }, 'Smart ranking failed, using text relevance');
      }
    }

    // If no results, get "did you mean" suggestions
    let suggestions: string[] | undefined;
    if (result.total === 0) {
      suggestions = await this.repo.getSuggestions(trimmed, 5);
    }

    return {
      data: rankedData,
      total: result.total,
      query: trimmed,
      mode,
      suggestions,
    };
  }

  /** Get autocomplete suggestions */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    return this.repo.getSuggestions(partialQuery.trim(), 5);
  }

  /** Get popular searches */
  async getPopularSearches(limit = 10): Promise<Array<{ query: string; searchCount: number }>> {
    return this.repo.getPopularSearches(limit);
  }

  /** Log a click on a search result */
  async logClick(searchId: string, productId: string): Promise<void> {
    await this.repo.logClick(searchId, productId);
    this.events.emit(SEARCH_EVENTS.SEARCH_CLICK, { searchId, productId }).catch(() => {});
  }

  /** Log a search + click in one go (for instant search overlay clicks) */
  async logSearchWithClick(
    query: string,
    clickedProductId: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      await this.repo.logSearch({
        query,
        resultsCount: 1,
        clickedProductId,
        sessionId: sessionId ?? undefined,
        customerId: undefined,
      });
    } catch {
      // non-critical, don't fail the request
    }
  }

  /** Get search analytics (admin) */
  async getAnalytics(daysBack = 30) {
    return this.repo.getAnalytics(daysBack);
  }

  /** Get zero-result searches (admin) */
  async getZeroResultSearches(limit = 50, daysBack = 30) {
    return this.repo.getZeroResultSearches(limit, daysBack);
  }

  /** CTR per search query (admin) */
  async getQueryCTR(daysBack = 30): Promise<QueryCTR[]> {
    return this.repo.getQueryCTR(daysBack);
  }

  /** Top clicked products from search (admin) */
  async getTopClickedProducts(daysBack = 30): Promise<TopClickedProduct[]> {
    return this.repo.getTopClickedProducts(daysBack);
  }

  /** Query → Product click mapping (admin) */
  async getQueryProductMap(daysBack = 30): Promise<QueryProductMapping[]> {
    return this.repo.getQueryProductMap(daysBack);
  }

  /** Product ranking scores with detailed breakdown (admin) */
  async getProductRankingScores(
    limit = 20,
  ): Promise<Array<ProductScore & { name: string; slug: string }>> {
    if (!this.ranking || !this.db) return [];

    try {
      const { sql: dsql } = await import('drizzle-orm');
      // Get top products by recent impressions to score
      const rows = await this.db.execute<{ id: string; name: string; slug: string }>(dsql`
        SELECT id, name, slug FROM products
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT ${limit * 2}
      `);

      const productIds = rows.map((r) => r.id);
      const detailed = await this.ranking.calculateDetailedScores(productIds);

      // Merge product info and sort by totalBoost
      const nameMap = new Map(rows.map((r) => [r.id, { name: r.name, slug: r.slug }]));
      return detailed
        .map((score) => ({
          ...score,
          name: nameMap.get(score.productId)?.name ?? '',
          slug: nameMap.get(score.productId)?.slug ?? '',
        }))
        .sort((a, b) => b.totalBoost - a.totalBoost)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  /** Instant search — lightweight results for search overlay (max 8) */
  async instantSearch(query: string): Promise<InstantSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const result = await this.repo.searchProducts({
      query: trimmed,
      limit: 8,
      offset: 0,
      sort: 'relevance',
    });

    const ids = result.data.map((p) => p.id);

    // Get images + translated names in parallel
    const [imageMap, nameMap] = await Promise.all([
      this.ranking ? this.getProductImages(ids) : Promise.resolve(new Map<string, string>()),
      this.getTranslatedNames(ids),
    ]);

    return result.data.map((p) => ({
      id: p.id,
      name: nameMap.get(p.id) ?? p.name,
      slug: p.slug,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      imageUrl: this.resolveImageUrl(imageMap.get(p.id) ?? null),
      hasDiscount: !!(p.compareAtPrice && p.compareAtPrice > p.price),
    }));
  }

  /** Get trending products */
  async getTrendingProducts(limit = 10): Promise<TrendingProduct[]> {
    if (!this.ranking) return [];
    let results = await this.ranking.getTrendingProducts(limit);

    // Fallback: if no impressions data yet, show newest products with discounts
    if (results.length === 0 && this.db) {
      try {
        const { sql: dsql } = await import('drizzle-orm');
        const rows = await this.db.execute<{
          id: string;
          name: string;
          slug: string;
          price: number;
          compare_at_price: number | null;
          currency: string;
          inventory_quantity: number;
        }>(dsql`
          SELECT id, name, slug, price, compare_at_price, currency, inventory_quantity
          FROM products
          WHERE status = 'active'
          ORDER BY
            CASE WHEN compare_at_price IS NOT NULL AND compare_at_price > price THEN 0 ELSE 1 END,
            created_at DESC
          LIMIT ${limit}
        `);

        const ids = rows.map((r) => r.id);
        const [imageMap, nameMap] = await Promise.all([
          this.ranking.getProductImages(ids),
          this.getTranslatedNames(ids),
        ]);

        results = rows.map((r) => ({
          id: r.id,
          name: nameMap.get(r.id) ?? r.name,
          slug: r.slug,
          price: r.price,
          compareAtPrice: r.compare_at_price,
          currency: r.currency,
          inventoryQuantity: r.inventory_quantity,
          imageUrl: r.id ? (imageMap.get(r.id) ?? null) : null,
          trendScore: 0,
        }));
      } catch {
        // ignore fallback errors
      }
    }

    return results.map((r) => ({
      ...r,
      imageUrl: this.resolveImageUrl(r.imageUrl),
    }));
  }

  /** Track a product impression */
  async trackImpression(params: {
    productId: string;
    eventType: 'view' | 'click' | 'cart_add' | 'purchase';
    sessionId?: string;
  }): Promise<void> {
    if (!this.ranking) return;
    await this.ranking.logImpression(params);
  }

  /** Helper to get product images via ranking service */
  private async getProductImages(productIds: string[]): Promise<Map<string, string>> {
    if (!this.ranking || productIds.length === 0) return new Map();
    return this.ranking.getProductImages(productIds);
  }

  /**
   * AI-enhanced query: expand synonyms, detect intent, fix typos.
   * Returns structured data for building better search filters.
   */
  private async enhanceQuery(query: string): Promise<EnhancedQuery> {
    if (!this.ai) {
      return { keywords: [query] };
    }

    const result = await this.ai.generateText({
      systemPrompt: `You are a search query analyzer for an e-commerce store.
Given a user's search query, extract:
- keywords: array of search terms (expand synonyms, fix typos)
- priceMin: minimum price in cents if mentioned (e.g. "unter 20 Euro" → priceMax: 2000)
- priceMax: maximum price in cents if mentioned
- category: category slug if clearly implied

Return ONLY valid JSON, no explanation. Example:
Input: "günstige Schere für Linkshänder unter 20€"
Output: {"keywords":["Schere","Linkshänder","ergonomisch","links"],"priceMax":2000}

Input: "Linkshädner Schere"
Output: {"keywords":["Linkshänder","Schere"]}

Input: "was habt ihr so an Stiften"
Output: {"keywords":["Stift","Stifte","Kugelschreiber","Bleistift"]}`,
      prompt: query,
      maxTokens: 200,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(result.text) as Record<string, unknown>;
      return {
        keywords: Array.isArray(parsed['keywords']) ? (parsed['keywords'] as string[]) : [query],
        priceMin: typeof parsed['priceMin'] === 'number' ? parsed['priceMin'] : undefined,
        priceMax: typeof parsed['priceMax'] === 'number' ? parsed['priceMax'] : undefined,
        category: typeof parsed['category'] === 'string' ? parsed['category'] : undefined,
      };
    } catch {
      logger.warn({ text: result.text }, 'Failed to parse AI response');
      return { keywords: [query] };
    }
  }
}
