/**
 * i18n configuration for the storefront.
 *
 * Locale list and default language are fetched from the API (admin settings).
 * ENV vars serve as fallback when the API is unavailable (e.g. during build).
 */

const API_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

const TRANSLATIONS_ENDPOINT = `${API_URL}/api/v1/public/translations`;

export interface I18nLocaleConfig {
  defaultLocale: string;
  supportedLocales: string[];
}

/** Static fallback from ENV vars (used when API is unreachable) */
export const fallbackConfig: I18nLocaleConfig = {
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en',
  supportedLocales: (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || 'en,de').split(','),
};

// ── In-memory cache (persists across requests within the same worker) ──

let cachedConfig: I18nLocaleConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute — fast enough to pick up admin changes

/**
 * Fetch locale config from the API. Cached for CACHE_TTL_MS.
 * Falls back to ENV vars if the API is unavailable.
 */
export async function getI18nConfig(): Promise<I18nLocaleConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const res = await fetch(TRANSLATIONS_ENDPOINT, {
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = (await res.json()) as {
        data: Array<{ locale: string; isDefault?: boolean }>;
      };

      const langs = json.data ?? [];
      if (langs.length > 0) {
        const defaultLang = langs.find((l) => l.isDefault);
        cachedConfig = {
          defaultLocale: defaultLang?.locale ?? langs[0]!.locale,
          supportedLocales: langs.map((l) => l.locale),
        };
        cacheTimestamp = now;
        return cachedConfig;
      }
    }
  } catch {
    // API unavailable — use fallback
  }

  return fallbackConfig;
}

/**
 * Synchronous access to the last fetched config.
 * Returns cached API config if available, otherwise ENV fallback.
 * Use this only where async is impossible (e.g. generateStaticParams).
 */
export function getI18nConfigSync(): I18nLocaleConfig {
  return cachedConfig ?? fallbackConfig;
}

// Re-export for backwards compatibility (used by generateStaticParams at build time)
export const defaultLocale = fallbackConfig.defaultLocale;
export const supportedLocales = fallbackConfig.supportedLocales;
