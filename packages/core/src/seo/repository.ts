import { eq, and, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { seoSettings, products, media, categories } from '@forkcart/database/schemas';

/** SEO settings repository */
export class SeoRepository {
  constructor(private readonly db: Database) {}

  /** Get a single SEO setting by key */
  async getSetting(key: string): Promise<string | null> {
    const rows = await this.db.select().from(seoSettings).where(eq(seoSettings.key, key)).limit(1);
    return rows[0]?.value ?? null;
  }

  /** Get all SEO settings */
  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(seoSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  /** Upsert an SEO setting */
  async setSetting(key: string, value: string): Promise<void> {
    await this.db
      .insert(seoSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: seoSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  /** Update product SEO fields */
  async updateProductSeo(
    productId: string,
    data: {
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      ogImage?: string;
    },
  ) {
    const [result] = await this.db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return result ?? null;
  }

  /** Get product with SEO data */
  async getProductWithSeo(productId: string) {
    const rows = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);
    return rows[0] ?? null;
  }

  /** Get products by IDs */
  async getProductsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const results = [];
    for (const id of ids) {
      const rows = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
      if (rows[0]) results.push(rows[0]);
    }
    return results;
  }

  /** Get all active products with SEO status info */
  async getProductSeoOverview() {
    const allProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        metaTitle: products.metaTitle,
        metaDescription: products.metaDescription,
        metaKeywords: products.metaKeywords,
        ogImage: products.ogImage,
      })
      .from(products)
      .where(eq(products.status, 'active'));

    const productSeoStatuses = [];
    for (const product of allProducts) {
      const mediaItems = await this.db
        .select({ id: media.id, alt: media.alt, altAuto: media.altAuto })
        .from(media)
        .where(and(eq(media.entityType, 'product'), eq(media.entityId, product.id)));

      const totalMedia = mediaItems.length;
      const withAlt = mediaItems.filter((m) => m.alt || m.altAuto).length;
      const altCoverage = totalMedia > 0 ? Math.round((withAlt / totalMedia) * 100) : 100;

      const hasTitle = !!product.metaTitle;
      const hasDesc = !!product.metaDescription;
      const hasKeywords = !!product.metaKeywords;
      const hasOg = !!product.ogImage;

      let score: 'good' | 'partial' | 'missing';
      if (hasTitle && hasDesc && altCoverage >= 80) {
        score = 'good';
      } else if (hasTitle || hasDesc) {
        score = 'partial';
      } else {
        score = 'missing';
      }

      productSeoStatuses.push({
        productId: product.id,
        productName: product.name,
        hasMetaTitle: hasTitle,
        hasMetaDescription: hasDesc,
        hasMetaKeywords: hasKeywords,
        hasOgImage: hasOg,
        altTextCoverage: altCoverage,
        score,
      });
    }

    return productSeoStatuses;
  }

  /** Update media alt text (auto-generated) */
  async updateMediaAltAuto(mediaId: string, altAuto: string) {
    const [result] = await this.db
      .update(media)
      .set({ altAuto })
      .where(eq(media.id, mediaId))
      .returning();
    return result ?? null;
  }

  /** Get media for a product */
  async getProductMedia(productId: string) {
    return this.db
      .select()
      .from(media)
      .where(and(eq(media.entityType, 'product'), eq(media.entityId, productId)))
      .orderBy(asc(media.sortOrder));
  }

  /** Get all active products (for sitemap) */
  async getActiveProducts() {
    return this.db
      .select({ id: products.id, slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, 'active'));
  }

  /** Get all active categories (for sitemap) */
  async getActiveCategories() {
    return this.db
      .select({ id: categories.id, slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true));
  }
}
