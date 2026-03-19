import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { pageTranslations } from '@forkcart/database/schemas';

export interface PageTranslation {
  id: string;
  pageId: string;
  locale: string;
  title: string | null;
  content: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageTranslationInput {
  title?: string | null;
  content?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export class PageTranslationRepository {
  constructor(private readonly db: Database) {}

  async getTranslations(pageId: string): Promise<PageTranslation[]> {
    const rows = await this.db
      .select()
      .from(pageTranslations)
      .where(eq(pageTranslations.pageId, pageId))
      .orderBy(pageTranslations.locale);
    return rows as PageTranslation[];
  }

  async getTranslation(pageId: string, locale: string): Promise<PageTranslation | null> {
    const [row] = await this.db
      .select()
      .from(pageTranslations)
      .where(and(eq(pageTranslations.pageId, pageId), eq(pageTranslations.locale, locale)));
    return (row as PageTranslation) ?? null;
  }

  async upsert(
    pageId: string,
    locale: string,
    data: PageTranslationInput,
  ): Promise<PageTranslation> {
    const [row] = await this.db
      .insert(pageTranslations)
      .values({
        pageId,
        locale,
        title: data.title ?? null,
        content: data.content ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [pageTranslations.pageId, pageTranslations.locale],
        set: {
          title: sql`excluded.title`,
          content: sql`excluded.content`,
          seoTitle: sql`excluded.seo_title`,
          seoDescription: sql`excluded.seo_description`,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!row) throw new Error('Failed to upsert page translation');
    return row as PageTranslation;
  }

  async delete(pageId: string, locale: string): Promise<void> {
    await this.db
      .delete(pageTranslations)
      .where(and(eq(pageTranslations.pageId, pageId), eq(pageTranslations.locale, locale)));
  }
}
