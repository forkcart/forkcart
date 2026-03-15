import { eq, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { productVariants } from '@forkcart/database/schemas';

export interface CreateVariantData {
  productId: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  inventoryQuantity?: number;
  attributes?: Record<string, string>;
  sortOrder?: number;
}

export interface UpdateVariantData {
  name?: string;
  sku?: string | null;
  price?: number | null;
  inventoryQuantity?: number;
  attributes?: Record<string, string>;
  sortOrder?: number;
}

export class VariantRepository {
  constructor(private readonly db: Database) {}

  async findByProductId(productId: string) {
    return this.db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      orderBy: [asc(productVariants.sortOrder)],
    });
  }

  async findById(id: string) {
    const result = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.id, id),
    });
    return result ?? null;
  }

  async create(data: CreateVariantData) {
    const [variant] = await this.db
      .insert(productVariants)
      .values({
        productId: data.productId,
        name: data.name,
        sku: data.sku ?? null,
        price: data.price ?? null,
        inventoryQuantity: data.inventoryQuantity ?? 0,
        attributes: data.attributes ?? {},
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    if (!variant) throw new Error('Failed to create variant');
    return variant;
  }

  async createMany(items: CreateVariantData[]) {
    if (items.length === 0) return [];
    const result = await this.db
      .insert(productVariants)
      .values(
        items.map((d) => ({
          productId: d.productId,
          name: d.name,
          sku: d.sku ?? null,
          price: d.price ?? null,
          inventoryQuantity: d.inventoryQuantity ?? 0,
          attributes: d.attributes ?? {},
          sortOrder: d.sortOrder ?? 0,
        })),
      )
      .returning();
    return result;
  }

  async update(id: string, data: UpdateVariantData) {
    const [result] = await this.db
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productVariants.id, id))
      .returning();
    return result ?? null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(productVariants)
      .where(eq(productVariants.id, id))
      .returning();
    return result ?? null;
  }

  async deleteByProductId(productId: string) {
    return this.db.delete(productVariants).where(eq(productVariants.productId, productId));
  }
}
