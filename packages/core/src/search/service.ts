import type { SearchRepository, SearchFilters, SearchResult } from './repository';
import type { EventBus } from '../plugins/event-bus';
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
  eventBus: EventBus;
  aiService?: AITextGenerator | null;
  semanticProvider?: SemanticSearchProvider | null;
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
  private readonly events: EventBus;
  private readonly ai: AITextGenerator | null;

  constructor(deps: SearchServiceDeps) {
    this.repo = deps.searchRepository;
    this.events = deps.eventBus;
    this.ai = deps.aiService ?? null;
    // semanticProvider reserved for future vector search (deps.semanticProvider)
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

    // If no results, get "did you mean" suggestions
    let suggestions: string[] | undefined;
    if (result.total === 0) {
      suggestions = await this.repo.getSuggestions(trimmed, 5);
    }

    return {
      data: result.data,
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

  /** Get search analytics (admin) */
  async getAnalytics(daysBack = 30) {
    return this.repo.getAnalytics(daysBack);
  }

  /** Get zero-result searches (admin) */
  async getZeroResultSearches(limit = 50, daysBack = 30) {
    return this.repo.getZeroResultSearches(limit, daysBack);
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
