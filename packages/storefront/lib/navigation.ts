import { defaultLocale, supportedLocales } from './i18n-config';

/** Build a locale-aware path. Default locale has no prefix. External URLs are returned as-is. */
export function localePath(path: string, locale: string): string {
  // Don't prefix external URLs
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }
  if (locale === defaultLocale) return path;
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Extract locale from a URL pathname */
export function extractLocaleFromPath(pathname: string): {
  locale: string;
  rest: string;
} {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] && supportedLocales.includes(segments[0])) {
    return {
      locale: segments[0],
      rest: '/' + segments.slice(1).join('/'),
    };
  }

  return { locale: defaultLocale, rest: pathname };
}
