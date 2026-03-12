import { eq, and, sql, count, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { categories } from '@forkcart/database/schemas';
import type { CreateCategoryInput, UpdateCategoryInput } from '@forkcart/shared';

/** Category repository — data access layer */
export class CategoryRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: { children: true },
    });
    return result ?? null;
  }

  async findBySlug(slug: string) {
    const result = await this.db.query.categories.findFirst({
      where: eq(categories.slug, slug),
      with: { children: true },
    });
    return result ?? null;
  }

  async findAll(activeOnly = false) {
    const conditions = activeOnly ? eq(categories.isActive, true) : undefined;
    return this.db.query.categories.findMany({
      where: conditions,
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
      with: { children: true },
    });
  }

  async findRoots(activeOnly = false) {
    const conditions = [sql`${categories.parentId} IS NULL`];
    if (activeOnly) {
      conditions.push(eq(categories.isActive, true));
    }

    return this.db.query.categories.findMany({
      where: and(...conditions),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
      with: { children: true },
    });
  }

  async create(input: CreateCategoryInput) {
    const [category] = await this.db.insert(categories).values(input).returning();
    if (!category) {
      throw new Error('Failed to create category');
    }
    return category;
  }

  async update(id: string, input: UpdateCategoryInput) {
    const [category] = await this.db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    return category ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(categories.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${categories.id} != ${excludeId}`);
    }

    const result = await this.db
      .select({ count: count() })
      .from(categories)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }

  async hasChildren(id: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(categories)
      .where(eq(categories.parentId, id));

    return (result[0]?.count ?? 0) > 0;
  }
}
