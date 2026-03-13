import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { languages, translations } from '@forkcart/database/schemas';

export interface LanguageRow {
  locale: string;
  name: string;
  nativeName: string | null;
  enabled: boolean;
  completionPct: string;
  createdAt: Date;
}

export interface TranslationRow {
  id: number;
  locale: string;
  key: string;
  value: string;
  updatedAt: Date;
}

export class TranslationRepository {
  constructor(private readonly db: Database) {}

  // ── Languages ─────────────────────────────────────────────────────

  async listLanguages(): Promise<LanguageRow[]> {
    const rows = await this.db.select().from(languages).orderBy(languages.locale);
    return rows as LanguageRow[];
  }

  async getLanguage(locale: string): Promise<LanguageRow | null> {
    const [row] = await this.db.select().from(languages).where(eq(languages.locale, locale));
    return (row as LanguageRow) ?? null;
  }

  async createLanguage(input: {
    locale: string;
    name: string;
    nativeName?: string;
  }): Promise<LanguageRow> {
    const [row] = await this.db
      .insert(languages)
      .values({
        locale: input.locale,
        name: input.name,
        nativeName: input.nativeName ?? input.name,
        enabled: true,
        completionPct: '0',
      })
      .returning();
    if (!row) throw new Error('Failed to create language');
    return row as LanguageRow;
  }

  async updateLanguageCompletion(locale: string, pct: number): Promise<void> {
    await this.db
      .update(languages)
      .set({ completionPct: pct.toFixed(2) })
      .where(eq(languages.locale, locale));
  }

  async deleteLanguage(locale: string): Promise<void> {
    await this.db.delete(languages).where(eq(languages.locale, locale));
  }

  // ── Translations ──────────────────────────────────────────────────

  async getTranslationsForLocale(locale: string): Promise<TranslationRow[]> {
    return (await this.db
      .select()
      .from(translations)
      .where(eq(translations.locale, locale))
      .orderBy(translations.key)) as TranslationRow[];
  }

  async upsertTranslation(locale: string, key: string, value: string): Promise<void> {
    await this.db
      .insert(translations)
      .values({ locale, key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [translations.locale, translations.key],
        set: { value, updatedAt: new Date() },
      });
  }

  async upsertMany(locale: string, entries: Array<{ key: string; value: string }>): Promise<void> {
    if (entries.length === 0) return;

    // Batch in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      await this.db
        .insert(translations)
        .values(chunk.map((e) => ({ locale, key: e.key, value: e.value, updatedAt: new Date() })))
        .onConflictDoUpdate({
          target: [translations.locale, translations.key],
          set: {
            value: sql`excluded.value`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
  }

  async deleteTranslation(locale: string, key: string): Promise<void> {
    await this.db
      .delete(translations)
      .where(and(eq(translations.locale, locale), eq(translations.key, key)));
  }

  async deleteAllForLocale(locale: string): Promise<void> {
    await this.db.delete(translations).where(eq(translations.locale, locale));
  }

  async countByLocale(locale: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(translations)
      .where(eq(translations.locale, locale));
    return result?.count ?? 0;
  }
}
