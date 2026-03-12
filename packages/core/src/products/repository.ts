import { eq, ilike, and, gte, lte, sql, asc, desc, count } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { products, productCategories } from '@forkcart/database/schemas';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductFilter,
  Pagination,
} from '@forkcart/shared';
import { calculatePagination } from '@forkcart/shared';

/** Product repository — data access layer using Drizzle ORM */
export class ProductRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        variants: true,
        productCategories: true,
      },
    });
    return result ?? null;
  }

  async findBySlug(slug: string) {
    const result = await this.db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: {
        variants: true,
        productCategories: true,
      },
    });
    return result ?? null;
  }

  async findMany(filter: ProductFilter, pagination: Pagination) {
    const conditions = [];

    if (filter.status) {
      conditions.push(eq(products.status, filter.status));
    }

    if (filter.search) {
      conditions.push(ilike(products.name, `%${filter.search}%`));
    }

    if (filter.minPrice !== undefined) {
      conditions.push(gte(products.price, filter.minPrice));
    }

    if (filter.maxPrice !== undefined) {
      conditions.push(lte(products.price, filter.maxPrice));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = {
      name: products.name,
      price: products.price,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    }[filter.sortBy];

    const orderFn = filter.sortDirection === 'asc' ? asc : desc;

    const [data, totalResult] = await Promise.all([
      this.db.query.products.findMany({
        where,
        orderBy: [orderFn(sortColumn)],
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        with: {
          variants: true,
          productCategories: true,
        },
      }),
      this.db.select({ count: count() }).from(products).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: calculatePagination(total, pagination.page, pagination.limit),
    };
  }

  async create(input: CreateProductInput) {
    const { categoryIds, ...productData } = input;

    return await this.db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values(productData).returning();

      if (!product) {
        throw new Error('Failed to create product');
      }

      if (categoryIds.length > 0) {
        await tx.insert(productCategories).values(
          categoryIds.map((categoryId) => ({
            productId: product.id,
            categoryId,
          })),
        );
      }

      return product;
    });
  }

  async update(id: string, input: UpdateProductInput) {
    const { categoryIds, ...productData } = input;

    return await this.db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({ ...productData, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (!product) {
        return null;
      }

      if (categoryIds !== undefined) {
        await tx.delete(productCategories).where(eq(productCategories.productId, id));

        if (categoryIds.length > 0) {
          await tx.insert(productCategories).values(
            categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          );
        }
      }

      return product;
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const conditions = [eq(products.slug, slug)];
    if (excludeId) {
      conditions.push(sql`${products.id} != ${excludeId}`);
    }

    const result = await this.db
      .select({ count: count() })
      .from(products)
      .where(and(...conditions));

    return (result[0]?.count ?? 0) > 0;
  }
}
