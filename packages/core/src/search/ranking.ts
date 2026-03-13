import { sql, and, gte, count } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import {
  productImpressions,
  products,
  searchQueries,
  orderItems,
} from '@forkcart/database/schemas';

/** Score components for a single product */
export interface ProductScore {
  productId: string;
  ctrBoost: number;
  conversionScore: number;
  recencyBoost: number;
  discountBoost: number;
  outOfStockPenalty: number;
  popularityScore: number;
  totalBoost: number;
}

/** Trending product with basic info */
export interface TrendingProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  inventoryQuantity: number;
  imageUrl: string | null;
  trendScore: number;
}

/** Weights for ranking factors — tweak these to tune results */
const WEIGHTS = {
  ctr: 0.3,
  conversion: 0.25,
  recency: 0.15,
  discount: 0.1,
  outOfStock: 0.5,
  popularity: 0.2,
} as const;

/** Maximum age (in days) for recency boost — products older than this get 0 boost */
const RECENCY_MAX_DAYS = 60;

export class RankingService {
  constructor(private readonly db: Database) {}

  /**
   * Calculate ranking boost scores for a set of product IDs.
   * Returns a map of productId → totalBoost to multiply with text relevance.
   */
  async calculateScores(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();

    const [ctrMap, conversionMap, popularityMap, productMeta] = await Promise.all([
      this.getCtrScores(productIds),
      this.getConversionScores(productIds),
      this.getPopularityScores(productIds),
      this.getProductMeta(productIds),
    ]);

    const scores = new Map<string, number>();

    for (const pid of productIds) {
      const ctrBoost = (ctrMap.get(pid) ?? 0) * WEIGHTS.ctr;
      const conversionScore = (conversionMap.get(pid) ?? 0) * WEIGHTS.conversion;
      const meta = productMeta.get(pid);

      // Recency: linear decay from 1.0 (today) to 0.0 (RECENCY_MAX_DAYS ago)
      let recencyBoost = 0;
      if (meta?.createdAt) {
        const daysSinceCreation = (Date.now() - meta.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        recencyBoost = Math.max(0, 1 - daysSinceCreation / RECENCY_MAX_DAYS) * WEIGHTS.recency;
      }

      // Discount: products with compareAtPrice > price get a boost
      let discountBoost = 0;
      if (meta?.compareAtPrice && meta.price > 0 && meta.compareAtPrice > meta.price) {
        const discountPct = (meta.compareAtPrice - meta.price) / meta.compareAtPrice;
        discountBoost = discountPct * WEIGHTS.discount;
      }

      // Out of stock penalty
      const outOfStockPenalty =
        meta?.inventoryQuantity !== undefined && meta.inventoryQuantity <= 0
          ? WEIGHTS.outOfStock
          : 0;

      const popularityBoost = (popularityMap.get(pid) ?? 0) * WEIGHTS.popularity;

      const totalBoost =
        1 +
        ctrBoost +
        conversionScore +
        recencyBoost +
        discountBoost +
        popularityBoost -
        outOfStockPenalty;

      scores.set(pid, Math.max(0.1, totalBoost));
    }

    return scores;
  }

  /** Click-Through-Rate: clicks / total search impressions for each product */
  private async getCtrScores(productIds: string[]): Promise<Map<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const rows = await this.db
      .select({
        productId: searchQueries.clickedProductId,
        clicks: count(),
      })
      .from(searchQueries)
      .where(
        and(
          sql`${searchQueries.clickedProductId} IN ${productIds}`,
          gte(searchQueries.createdAt, since),
          sql`${searchQueries.clickedProductId} IS NOT NULL`,
        ),
      )
      .groupBy(searchQueries.clickedProductId);

    // Normalize: divide by max to get 0-1 range
    const maxClicks = Math.max(1, ...rows.map((r) => Number(r.clicks)));
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.productId) {
        map.set(row.productId, Number(row.clicks) / maxClicks);
      }
    }
    return map;
  }

  /** Conversion: how often a product appears in orders */
  private async getConversionScores(productIds: string[]): Promise<Map<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const rows = await this.db
      .select({
        productId: orderItems.productId,
        orderCount: count(),
      })
      .from(orderItems)
      .where(sql`${orderItems.productId} IN ${productIds}`)
      .groupBy(orderItems.productId);

    const maxOrders = Math.max(1, ...rows.map((r) => Number(r.orderCount)));
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productId, Number(row.orderCount) / maxOrders);
    }
    return map;
  }

  /** Popularity: total click/view impressions in the last 30 days */
  private async getPopularityScores(productIds: string[]): Promise<Map<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const rows = await this.db
      .select({
        productId: productImpressions.productId,
        total: count(),
      })
      .from(productImpressions)
      .where(
        and(
          sql`${productImpressions.productId} IN ${productIds}`,
          gte(productImpressions.createdAt, since),
        ),
      )
      .groupBy(productImpressions.productId);

    const maxTotal = Math.max(1, ...rows.map((r) => Number(r.total)));
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productId, Number(row.total) / maxTotal);
    }
    return map;
  }

  /** Fetch product metadata needed for ranking */
  private async getProductMeta(productIds: string[]): Promise<
    Map<
      string,
      {
        price: number;
        compareAtPrice: number | null;
        inventoryQuantity: number;
        createdAt: Date;
      }
    >
  > {
    const rows = await this.db
      .select({
        id: products.id,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        inventoryQuantity: products.inventoryQuantity,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(sql`${products.id} IN ${productIds}`);

    const map = new Map<
      string,
      {
        price: number;
        compareAtPrice: number | null;
        inventoryQuantity: number;
        createdAt: Date;
      }
    >();
    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }

  /** Log a product impression */
  async logImpression(params: {
    productId: string;
    eventType: 'view' | 'click' | 'cart_add' | 'purchase';
    sessionId?: string;
  }): Promise<void> {
    await this.db.insert(productImpressions).values({
      productId: params.productId,
      eventType: params.eventType,
      sessionId: params.sessionId ?? null,
    });
  }

  /** Get trending products based on recent impressions */
  async getTrendingProducts(limit = 10, daysBack = 7): Promise<TrendingProduct[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // Weighted score: purchase=5, cart_add=3, click=2, view=1
    const rows = await this.db.execute<{
      id: string;
      name: string;
      slug: string;
      price: number;
      compare_at_price: number | null;
      currency: string;
      inventory_quantity: number;
      trend_score: number;
    }>(sql`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.price,
        p.compare_at_price,
        p.currency,
        p.inventory_quantity,
        SUM(
          CASE pi.event_type
            WHEN 'purchase' THEN 5
            WHEN 'cart_add' THEN 3
            WHEN 'click' THEN 2
            WHEN 'view' THEN 1
            ELSE 0
          END
        )::int AS trend_score
      FROM product_impressions pi
      JOIN products p ON p.id = pi.product_id
      WHERE pi.created_at >= ${since}
        AND p.status = 'active'
      GROUP BY p.id, p.name, p.slug, p.price, p.compare_at_price, p.currency, p.inventory_quantity
      ORDER BY trend_score DESC
      LIMIT ${limit}
    `);

    // Get images for these products
    const productIds = rows.map((r) => r.id);
    const imageMap = await this.getProductImages(productIds);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      price: r.price,
      compareAtPrice: r.compare_at_price,
      currency: r.currency,
      inventoryQuantity: r.inventory_quantity,
      imageUrl: imageMap.get(r.id) ?? null,
      trendScore: Number(r.trend_score),
    }));
  }

  /** Get first image URL for a list of products */
  async getProductImages(productIds: string[]): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map();

    const rows = await this.db.execute<{
      entity_id: string;
      path: string;
    }>(sql`
      SELECT DISTINCT ON (entity_id)
        entity_id, path
      FROM media
      WHERE entity_type = 'product'
        AND entity_id::text = ANY(${productIds})
      ORDER BY entity_id, sort_order ASC
    `);

    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.entity_id, row.path);
    }
    return map;
  }
}
