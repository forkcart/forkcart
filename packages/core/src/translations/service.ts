import { createLogger } from '../lib/logger';
import type { TranslationRepository } from './repository';
import { flattenTranslations, type TranslationDict, type FlatTranslations } from '@forkcart/i18n';

const logger = createLogger('translation-service');

/** Native language name map */
const NATIVE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  pl: 'Polski',
  cs: 'Čeština',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  ru: 'Русский',
  tr: 'Türkçe',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  hu: 'Magyar',
  ro: 'Română',
  uk: 'Українська',
  el: 'Ελληνικά',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  hi: 'हिन्दी',
};

export interface TranslationServiceDeps {
  translationRepository: TranslationRepository;
  /** JSON file defaults (flat): { en: { "cart.title": "Cart" }, de: {...} } */
  fileDefaults: Record<string, FlatTranslations>;
}

export interface LanguageInfo {
  locale: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  completionPct: number;
  totalKeys: number;
  translatedKeys: number;
}

export interface MergedTranslations {
  locale: string;
  translations: FlatTranslations;
}

/** Minimal AI provider interface for translation */
export interface TranslationAIProvider {
  chat(
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number },
  ): Promise<{ content: string }>;
}

export class TranslationService {
  private readonly repo: TranslationRepository;
  private fileDefaults: Record<string, FlatTranslations>;
  private aiProvider: TranslationAIProvider | null = null;

  constructor(deps: TranslationServiceDeps) {
    this.repo = deps.translationRepository;
    this.fileDefaults = deps.fileDefaults;
  }

  /** Set AI provider for auto-translation */
  setAIProvider(provider: TranslationAIProvider | null): void {
    this.aiProvider = provider;
  }

  /** Update file defaults (e.g. after loading JSON at startup) */
  setFileDefaults(defaults: Record<string, FlatTranslations>): void {
    this.fileDefaults = defaults;
  }

  /** Get reference keys (from English baseline) */
  private getReferenceKeys(): string[] {
    const en = this.fileDefaults['en'];
    return en ? Object.keys(en) : [];
  }

  // ── Language CRUD ─────────────────────────────────────────────────

  async listLanguages(): Promise<LanguageInfo[]> {
    const langs = await this.repo.listLanguages();
    const refKeys = this.getReferenceKeys();
    const totalKeys = refKeys.length;

    const result: LanguageInfo[] = [];
    for (const lang of langs) {
      const dbRows = await this.repo.getTranslationsForLocale(lang.locale);
      const dbMap = new Map(dbRows.map((r) => [r.key, r.value]));
      const fileMap = this.fileDefaults[lang.locale] ?? {};

      // Count how many reference keys have a value (file or DB)
      let translated = 0;
      for (const key of refKeys) {
        if (dbMap.has(key) || fileMap[key]) translated++;
      }

      const pct = totalKeys > 0 ? (translated / totalKeys) * 100 : 0;
      // Update stored completion pct
      await this.repo.updateLanguageCompletion(lang.locale, pct);

      result.push({
        locale: lang.locale,
        name: lang.name,
        nativeName: lang.nativeName ?? lang.name,
        enabled: lang.enabled,
        completionPct: Math.round(pct * 100) / 100,
        totalKeys,
        translatedKeys: translated,
      });
    }

    return result;
  }

  async createLanguage(locale: string, name?: string): Promise<LanguageInfo> {
    const existing = await this.repo.getLanguage(locale);
    if (existing) throw new Error(`Language "${locale}" already exists`);

    const displayName = name ?? NATIVE_NAMES[locale] ?? locale.toUpperCase();
    const nativeName = NATIVE_NAMES[locale] ?? displayName;

    await this.repo.createLanguage({ locale, name: displayName, nativeName });
    logger.info({ locale, name: displayName }, 'Language created');

    const refKeys = this.getReferenceKeys();
    return {
      locale,
      name: displayName,
      nativeName,
      enabled: true,
      completionPct: 0,
      totalKeys: refKeys.length,
      translatedKeys: 0,
    };
  }

  async deleteLanguage(locale: string): Promise<void> {
    if (locale === 'en') throw new Error('Cannot delete the default English language');
    await this.repo.deleteLanguage(locale);
    logger.info({ locale }, 'Language deleted');
  }

  // ── Translation CRUD ──────────────────────────────────────────────

  /**
   * Get merged translations for a locale (file defaults + DB overrides).
   * Returns flat key→value map.
   */
  async getTranslations(locale: string): Promise<FlatTranslations> {
    const fileMap = this.fileDefaults[locale] ?? {};
    const dbRows = await this.repo.getTranslationsForLocale(locale);
    const merged: FlatTranslations = { ...fileMap };
    for (const row of dbRows) {
      merged[row.key] = row.value;
    }
    return merged;
  }

  /**
   * Get all keys for a locale with source info (for the admin editor).
   */
  async getTranslationKeys(locale: string): Promise<
    Array<{
      key: string;
      value: string;
      source: 'file' | 'db' | 'missing';
      enValue: string;
    }>
  > {
    const refKeys = this.getReferenceKeys();
    const enMap = this.fileDefaults['en'] ?? {};
    const fileMap = this.fileDefaults[locale] ?? {};
    const dbRows = await this.repo.getTranslationsForLocale(locale);
    const dbMap = new Map(dbRows.map((r) => [r.key, r.value]));

    return refKeys.map((key) => {
      const dbVal = dbMap.get(key);
      const fileVal = fileMap[key];
      let value: string;
      let source: 'file' | 'db' | 'missing';

      if (dbVal !== undefined) {
        value = dbVal;
        source = 'db';
      } else if (fileVal !== undefined) {
        value = fileVal;
        source = 'file';
      } else {
        value = '';
        source = 'missing';
      }

      return { key, value, source, enValue: enMap[key] ?? key };
    });
  }

  /** Save a full locale (replaces all DB overrides) */
  async saveTranslations(locale: string, entries: Record<string, string>): Promise<void> {
    const lang = await this.repo.getLanguage(locale);
    if (!lang) throw new Error(`Language "${locale}" not found`);

    const pairs = Object.entries(entries).map(([key, value]) => ({ key, value }));
    await this.repo.deleteAllForLocale(locale);
    await this.repo.upsertMany(locale, pairs);
    logger.info({ locale, count: pairs.length }, 'Translations saved (full replace)');
  }

  /** Patch specific keys for a locale */
  async patchTranslations(locale: string, entries: Record<string, string>): Promise<void> {
    const lang = await this.repo.getLanguage(locale);
    if (!lang) throw new Error(`Language "${locale}" not found`);

    const pairs = Object.entries(entries).map(([key, value]) => ({ key, value }));
    await this.repo.upsertMany(locale, pairs);
    logger.info({ locale, count: pairs.length }, 'Translations patched');
  }

  /** Export as nested JSON (for download / file generation) */
  async exportLocale(locale: string): Promise<TranslationDict> {
    const flat = await this.getTranslations(locale);
    return unflatten(flat);
  }

  /** Import from nested JSON (upload) */
  async importLocale(locale: string, data: TranslationDict): Promise<number> {
    const lang = await this.repo.getLanguage(locale);
    if (!lang) throw new Error(`Language "${locale}" not found`);

    const flat = flattenTranslations(data);
    const pairs = Object.entries(flat).map(([key, value]) => ({ key, value }));
    await this.repo.upsertMany(locale, pairs);
    logger.info({ locale, count: pairs.length }, 'Translations imported');
    return pairs.length;
  }

  /**
   * AI-translate missing keys for a locale.
   * Takes English values and translates them to the target language.
   * Returns the translated key-value pairs (also saves to DB).
   */
  async autoTranslateMissing(
    locale: string,
  ): Promise<{ translated: Record<string, string>; count: number }> {
    if (!this.aiProvider) throw new Error('AI provider not configured');
    if (locale === 'en')
      throw new Error('Cannot auto-translate English (it is the source language)');

    const lang = await this.repo.getLanguage(locale);
    if (!lang) throw new Error(`Language "${locale}" not found`);

    const refKeys = this.getReferenceKeys();
    const enMap = this.fileDefaults['en'] ?? {};
    const dbRows = await this.repo.getTranslationsForLocale(locale);
    const dbMap = new Map(dbRows.map((r) => [r.key, r.value]));
    const fileMap = this.fileDefaults[locale] ?? {};

    // Find missing keys (no DB override AND no file default)
    const missing: Record<string, string> = {};
    for (const key of refKeys) {
      if (!dbMap.has(key) && !fileMap[key] && enMap[key]) {
        missing[key] = enMap[key];
      }
    }

    if (Object.keys(missing).length === 0) {
      return { translated: {}, count: 0 };
    }

    const targetLang = NATIVE_NAMES[locale] ?? locale;

    // Batch in chunks of 50 to avoid token limits
    const entries = Object.entries(missing);
    const allTranslated: Record<string, string> = {};
    const BATCH = 50;

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const jsonPayload = Object.fromEntries(batch);

      const response = await this.aiProvider.chat(
        [
          {
            role: 'system',
            content: `You are a professional translator. Translate the JSON values from English to ${targetLang}. Keep the keys EXACTLY the same. Return ONLY valid JSON, no markdown, no explanation. Keep translations concise and natural — these are UI strings for an e-commerce shop.`,
          },
          {
            role: 'user',
            content: JSON.stringify(jsonPayload, null, 2),
          },
        ],
        { temperature: 0.3 },
      );

      try {
        // Strip markdown code fences if present
        let raw = response.content.trim();
        if (raw.startsWith('```')) {
          raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(raw) as Record<string, string>;
        Object.assign(allTranslated, parsed);
      } catch {
        logger.error({ locale, batch: i }, 'Failed to parse AI translation response');
      }
    }

    // Save to DB
    if (Object.keys(allTranslated).length > 0) {
      const pairs = Object.entries(allTranslated).map(([key, value]) => ({ key, value }));
      await this.repo.upsertMany(locale, pairs);
      logger.info({ locale, count: pairs.length }, 'AI translations saved');
    }

    return { translated: allTranslated, count: Object.keys(allTranslated).length };
  }

  /**
   * AI-translate specific keys for a locale.
   */
  async autoTranslateKeys(
    locale: string,
    keys: string[],
  ): Promise<{ translated: Record<string, string>; count: number }> {
    if (!this.aiProvider) throw new Error('AI provider not configured');
    if (locale === 'en')
      throw new Error('Cannot auto-translate English (it is the source language)');

    const enMap = this.fileDefaults['en'] ?? {};
    const toTranslate: Record<string, string> = {};
    for (const key of keys) {
      if (enMap[key]) toTranslate[key] = enMap[key];
    }

    if (Object.keys(toTranslate).length === 0) {
      return { translated: {}, count: 0 };
    }

    const targetLang = NATIVE_NAMES[locale] ?? locale;

    const response = await this.aiProvider.chat(
      [
        {
          role: 'system',
          content: `You are a professional translator. Translate the JSON values from English to ${targetLang}. Keep the keys EXACTLY the same. Return ONLY valid JSON, no markdown, no explanation. Keep translations concise and natural — these are UI strings for an e-commerce shop.`,
        },
        {
          role: 'user',
          content: JSON.stringify(toTranslate, null, 2),
        },
      ],
      { temperature: 0.3 },
    );

    let raw = response.content.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const translated = JSON.parse(raw) as Record<string, string>;

    // Save to DB
    const pairs = Object.entries(translated).map(([key, value]) => ({ key, value }));
    await this.repo.upsertMany(locale, pairs);

    return { translated, count: pairs.length };
  }
}

/** Unflatten "cart.title" → { cart: { title: ... } } */
function unflatten(flat: FlatTranslations): TranslationDict {
  const result: TranslationDict = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]!] = value;
  }
  return result as TranslationDict;
}
