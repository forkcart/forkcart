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

export class TranslationService {
  private readonly repo: TranslationRepository;
  private fileDefaults: Record<string, FlatTranslations>;

  constructor(deps: TranslationServiceDeps) {
    this.repo = deps.translationRepository;
    this.fileDefaults = deps.fileDefaults;
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
