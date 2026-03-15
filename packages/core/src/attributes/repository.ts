import { eq, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { productAttributes } from '@forkcart/database/schemas';

export interface CreateAttributeData {
  name: string;
  slug: string;
  type?: string;
  values?: unknown[];
  sortOrder?: number;
}

export interface UpdateAttributeData {
  name?: string;
  slug?: string;
  type?: string;
  values?: unknown[];
  sortOrder?: number;
}

export class AttributeRepository {
  constructor(private readonly db: Database) {}

  async findAll() {
    return this.db.query.productAttributes.findMany({
      orderBy: [asc(productAttributes.sortOrder)],
    });
  }

  async findById(id: string) {
    const result = await this.db.query.productAttributes.findFirst({
      where: eq(productAttributes.id, id),
    });
    return result ?? null;
  }

  async findBySlug(slug: string) {
    const result = await this.db.query.productAttributes.findFirst({
      where: eq(productAttributes.slug, slug),
    });
    return result ?? null;
  }

  async create(data: CreateAttributeData) {
    const [attr] = await this.db
      .insert(productAttributes)
      .values({
        name: data.name,
        slug: data.slug,
        type: data.type ?? 'text',
        values: data.values ?? [],
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    if (!attr) throw new Error('Failed to create attribute');
    return attr;
  }

  async update(id: string, data: UpdateAttributeData) {
    const [result] = await this.db
      .update(productAttributes)
      .set(data)
      .where(eq(productAttributes.id, id))
      .returning();
    return result ?? null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(productAttributes)
      .where(eq(productAttributes.id, id))
      .returning();
    return result ?? null;
  }
}
