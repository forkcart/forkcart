import { getI18nConfigSync } from './i18n-config';

/**
 * Build a locale-aware path. Default locale has no prefix.
 * External URLs are returned as-is.
 *
 * @param path - The path (e.g. "/products")
 * @param locale - The target locale (e.g. "de")
 * @param defaultLocaleOverride - Override the default locale (useful in server components
 *   that already fetched the config). If omitted, uses the cached/fallback config.
 */
export function localePath(path: string, locale: string, defaultLocaleOverride?: string): string {
  // Don't prefix external URLs
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }

  const defaultLoc = defaultLocaleOverride ?? getI18nConfigSync().defaultLocale;

  if (locale === defaultLoc) return path;
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Extract locale from a URL pathname */
export function extractLocaleFromPath(pathname: string): {
  locale: string;
  rest: string;
} {
  const { supportedLocales, defaultLocale } = getI18nConfigSync();
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] && supportedLocales.includes(segments[0])) {
    return {
      locale: segments[0],
      rest: '/' + segments.slice(1).join('/'),
    };
  }

  return { locale: defaultLocale, rest: pathname };
}
