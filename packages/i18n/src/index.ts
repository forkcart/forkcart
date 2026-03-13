export type Locale = string;
export interface TranslationDict {
  [key: string]: string | TranslationDict;
}
export type FlatTranslations = Record<string, string>;

/** Flatten nested translation objects: { cart: { empty: "..." } } → { "cart.empty": "..." } */
export function flattenTranslations(obj: TranslationDict, prefix = ''): FlatTranslations {
  const result: FlatTranslations = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flattenTranslations(value, fullKey));
    }
  }
  return result;
}

/** Core translation function with interpolation and plural support */
export function translate(
  translations: FlatTranslations,
  key: string,
  params?: Record<string, string | number>,
  fallback?: FlatTranslations,
): string {
  // Plural support: if params.count exists, try key_plural / key_one
  let resolvedKey = key;
  if (params && 'count' in params) {
    const count = Number(params['count']);
    if (count !== 1) {
      const pluralKey = `${key}_plural`;
      if (translations[pluralKey] || fallback?.[pluralKey]) {
        resolvedKey = pluralKey;
      }
    }
  }

  let value =
    translations[resolvedKey] ??
    fallback?.[resolvedKey] ??
    translations[key] ??
    fallback?.[key] ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return value;
}

/**
 * Parse Accept-Language header and return the best matching locale.
 * E.g. "de-DE,de;q=0.9,en;q=0.8" → 'de' (if supported)
 */
export function parseAcceptLanguage(
  header: string | undefined | null,
  supported: string[],
): string | null {
  if (!header) return null;

  const langs = header
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';');
      const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1;
      return { lang: lang!.trim().split('-')[0]!, q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    if (supported.includes(lang)) return lang;
  }

  return null;
}

export type { I18nConfig } from './config';
export { DEFAULT_I18N_CONFIG } from './config';
