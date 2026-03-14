import { eq, and, sql, asc, desc, count } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { pages } from '@forkcart/database/schemas';
import { calculatePagination } from '@forkcart/shared';
import type { Pagination } from '@forkcart/shared';

export interface CreatePageInput {
  title: string;
  slug: string;
  status?: string;
  content?: unknown;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  isHomepage?: boolean;
  sortOrder?: number;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  status?: string;
  content?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  isHomepage?: boolean;
  sortOrder?: number;
}

export interface PageFilter {
  status?: string;
}

/** Page repository — data access layer using Drizzle ORM */
export class PageRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.pages.findFirst({
      where: eq(pages.id, id),
      with: {
        translations: true,
      },
    });
    return result ?? null;
  }

  async findBySlug(slug: string) {
    const result = await this.db.query.pages.findFirst({
      where: eq(pages.slug, slug),
      with: {
        translations: true,
      },
    });
    return result ?? null;
  }

  async findHomepage() {
    const result = await this.db.query.pages.findFirst({
      where: and(eq(pages.isHomepage, true), eq(pages.status, 'published')),
      with: {
        translations: true,
      },
    });
    return result ?? null;
  }

  async findMany(filter: PageFilter, pagination: Pagination) {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(pages.status, filter.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      this.db.query.pages.findMany({
        where,
        orderBy: [asc(pages.sortOrder), desc(pages.createdAt)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        with: {
          translations: true,
        },
      }),
      this.db.select({ count: count() }).from(pages).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: calculatePagination(total, pagination.page, pagination.limit),
    };
  }

  async create(input: CreatePageInput) {
    const [page] = await this.db.insert(pages).values(input).returning();

    if (!page) {
      throw new Error('Failed to create page');
    }

    return page;
  }

  async update(id: string, input: UpdatePageInput) {
    const [page] = await this.db
      .update(pages)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    return page ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(pages).where(eq(pages.id, id)).returning();
    return result.length > 0;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(pages.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${pages.id} != ${excludeId}`);
    }

    const result = await this.db
      .select({ count: count() })
      .from(pages)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }

  async publish(id: string) {
    const [page] = await this.db
      .update(pages)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    return page ?? null;
  }

  async unpublish(id: string) {
    const [page] = await this.db
      .update(pages)
      .set({ status: 'draft', publishedAt: null, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();

    return page ?? null;
  }

  async clearHomepage() {
    await this.db
      .update(pages)
      .set({ isHomepage: false, updatedAt: new Date() })
      .where(eq(pages.isHomepage, true));
  }
}
