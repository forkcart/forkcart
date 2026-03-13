import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { productTranslations } from '@forkcart/database/schemas';

export interface ProductTranslation {
  id: string;
  productId: string;
  locale: string;
  name: string | null;
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationInput {
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export class ProductTranslationRepository {
  constructor(private readonly db: Database) {}

  async getTranslations(productId: string): Promise<ProductTranslation[]> {
    const rows = await this.db
      .select()
      .from(productTranslations)
      .where(eq(productTranslations.productId, productId))
      .orderBy(productTranslations.locale);
    return rows as ProductTranslation[];
  }

  async getTranslation(productId: string, locale: string): Promise<ProductTranslation | null> {
    const [row] = await this.db
      .select()
      .from(productTranslations)
      .where(
        and(eq(productTranslations.productId, productId), eq(productTranslations.locale, locale)),
      );
    return (row as ProductTranslation) ?? null;
  }

  async upsert(
    productId: string,
    locale: string,
    data: TranslationInput,
  ): Promise<ProductTranslation> {
    const [row] = await this.db
      .insert(productTranslations)
      .values({
        productId,
        locale,
        name: data.name ?? null,
        description: data.description ?? null,
        shortDescription: data.shortDescription ?? null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          shortDescription: sql`excluded.short_description`,
          metaTitle: sql`excluded.meta_title`,
          metaDescription: sql`excluded.meta_description`,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert product translation');
    return row as ProductTranslation;
  }

  async delete(productId: string, locale: string): Promise<void> {
    await this.db
      .delete(productTranslations)
      .where(
        and(eq(productTranslations.productId, productId), eq(productTranslations.locale, locale)),
      );
  }
}
