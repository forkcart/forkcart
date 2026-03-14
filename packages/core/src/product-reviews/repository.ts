import { eq, and, desc, sql, avg } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { productReviews } from '@forkcart/database/schemas';

export interface CreateReviewData {
  productId: string;
  customerId: string;
  rating: number;
  title?: string | null;
  content?: string | null;
}

export interface UpdateReviewData {
  status?: string;
}

export class ProductReviewRepository {
  constructor(private readonly db: Database) {}

  async findByProductId(productId: string, options?: { status?: string }) {
    if (options?.status) {
      return this.db.query.productReviews.findMany({
        where: and(
          eq(productReviews.productId, productId),
          eq(productReviews.status, options.status),
        ),
        orderBy: [desc(productReviews.createdAt)],
      });
    }
    return this.db.query.productReviews.findMany({
      where: eq(productReviews.productId, productId),
      orderBy: [desc(productReviews.createdAt)],
    });
  }

  async findAll(options?: { status?: string }) {
    if (options?.status) {
      return this.db.query.productReviews.findMany({
        where: eq(productReviews.status, options.status),
        orderBy: [desc(productReviews.createdAt)],
      });
    }
    return this.db.query.productReviews.findMany({
      orderBy: [desc(productReviews.createdAt)],
    });
  }

  async findById(id: string) {
    const result = await this.db.query.productReviews.findFirst({
      where: eq(productReviews.id, id),
    });
    return result ?? null;
  }

  async create(data: CreateReviewData) {
    const [review] = await this.db
      .insert(productReviews)
      .values({
        productId: data.productId,
        customerId: data.customerId,
        rating: data.rating,
        title: data.title ?? null,
        content: data.content ?? null,
      })
      .returning();
    if (!review) throw new Error('Failed to create review');
    return review;
  }

  async updateStatus(id: string, status: string) {
    const [result] = await this.db
      .update(productReviews)
      .set({ status, updatedAt: new Date() })
      .where(eq(productReviews.id, id))
      .returning();
    return result ?? null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(productReviews)
      .where(eq(productReviews.id, id))
      .returning();
    return result ?? null;
  }

  async getAverageRating(productId: string): Promise<{ average: number; count: number }> {
    const result = await this.db
      .select({
        average: avg(productReviews.rating),
        count: sql<number>`count(*)::int`,
      })
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, 'approved')));

    const row = result[0];
    return {
      average: row?.average ? parseFloat(String(row.average)) : 0,
      count: row?.count ?? 0,
    };
  }

  async getAverageRatingsForProducts(
    productIds: string[],
  ): Promise<Record<string, { average: number; count: number }>> {
    if (productIds.length === 0) return {};

    const results = await this.db
      .select({
        productId: productReviews.productId,
        average: avg(productReviews.rating),
        count: sql<number>`count(*)::int`,
      })
      .from(productReviews)
      .where(
        and(
          sql`${productReviews.productId} = ANY(${productIds})`,
          eq(productReviews.status, 'approved'),
        ),
      )
      .groupBy(productReviews.productId);

    const map: Record<string, { average: number; count: number }> = {};
    for (const row of results) {
      map[row.productId] = {
        average: row.average ? parseFloat(String(row.average)) : 0,
        count: row.count ?? 0,
      };
    }
    return map;
  }
}
