import { eq, and, asc, count } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { media } from '@forkcart/database/schemas';
import type { Pagination } from '@forkcart/shared';
import { calculatePagination } from '@forkcart/shared';

export interface CreateMediaInput {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  alt?: string;
  entityType?: string;
  entityId?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateMediaInput {
  alt?: string;
  entityType?: string;
  entityId?: string;
  sortOrder?: number;
}

/** Media repository — data access layer */
export class MediaRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.media.findFirst({
      where: eq(media.id, id),
    });
    return result ?? null;
  }

  async findMany(pagination: Pagination) {
    const [data, totalResult] = await Promise.all([
      this.db.query.media.findMany({
        orderBy: [asc(media.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      }),
      this.db.select({ count: count() }).from(media),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: calculatePagination(total, pagination.page, pagination.limit),
    };
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.db.query.media.findMany({
      where: and(eq(media.entityType, entityType), eq(media.entityId, entityId)),
      orderBy: [asc(media.sortOrder)],
    });
  }

  async create(input: CreateMediaInput) {
    const [result] = await this.db.insert(media).values(input).returning();
    if (!result) throw new Error('Failed to create media record');
    return result;
  }

  async update(id: string, input: UpdateMediaInput) {
    const [result] = await this.db.update(media).set(input).where(eq(media.id, id)).returning();
    return result ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(media).where(eq(media.id, id)).returning();
    return result.length > 0;
  }

  async deleteByEntity(entityType: string, entityId: string): Promise<number> {
    const result = await this.db
      .delete(media)
      .where(and(eq(media.entityType, entityType), eq(media.entityId, entityId)))
      .returning();
    return result.length;
  }

  async updateSortOrders(updates: Array<{ id: string; sortOrder: number }>) {
    for (const { id, sortOrder } of updates) {
      await this.db.update(media).set({ sortOrder }).where(eq(media.id, id));
    }
  }
}
