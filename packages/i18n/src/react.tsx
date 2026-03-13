import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  translate,
  flattenTranslations,
  type FlatTranslations,
  type TranslationDict,
  type Locale,
} from './index';

// Native language names for the switcher
export const LOCALE_NAMES: Record<string, string> = {
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

export const LOCALE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  nl: '🇳🇱',
  pt: '🇵🇹',
  pl: '🇵🇱',
  cs: '🇨🇿',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  ar: '🇸🇦',
  ru: '🇷🇺',
  tr: '🇹🇷',
  sv: '🇸🇪',
  da: '🇩🇰',
  fi: '🇫🇮',
  no: '🇳🇴',
  hu: '🇭🇺',
  ro: '🇷🇴',
  uk: '🇺🇦',
  el: '🇬🇷',
  th: '🇹🇭',
  vi: '🇻🇳',
  hi: '🇮🇳',
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: string;
  supportedLocales?: string[];
  translations: Record<Locale, TranslationDict>;
  /** Optional API base URL for dynamic translations (e.g. http://localhost:4000/api/v1/public/translations) */
  apiBaseUrl?: string;
}

export function I18nProvider({
  children,
  defaultLocale = 'en',
  supportedLocales = ['en'],
  translations,
  apiBaseUrl,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forkcart_locale');
      // Allow stored locale even if not yet in supportedLocales (API locales load async)
      if (stored) return stored;
      const browserLang = navigator.language.split('-')[0]!;
      if (supportedLocales.includes(browserLang)) return browserLang;
    }
    return defaultLocale;
  });

  // Dynamic API overrides (flat keys from DB)
  const [apiOverrides, setApiOverrides] = useState<Record<string, FlatTranslations>>({});
  // Dynamic locales from API (merged with static supportedLocales)
  const [apiLocales, setApiLocales] = useState<string[]>([]);

  // Fetch available languages from API on mount
  useEffect(() => {
    if (!apiBaseUrl) return;
    fetch(apiBaseUrl)
      .then((res) => (res.ok ? (res.json() as Promise<{ data: Array<{ locale: string }> }>) : null))
      .then((data) => {
        if (data?.data) {
          setApiLocales(data.data.map((l) => l.locale));
        }
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  // Merge static + API locales (deduplicated, stable order)
  const allLocales = useMemo(() => {
    const set = new Set([...supportedLocales, ...apiLocales]);
    return Array.from(set);
  }, [supportedLocales, apiLocales]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forkcart_locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Fetch dynamic translations from API when locale changes
  useEffect(() => {
    if (!apiBaseUrl) return;

    // Skip if we already fetched this locale
    if (apiOverrides[locale]) return;

    fetch(`${apiBaseUrl}/${locale}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ data: { locale: string; translations: FlatTranslations } }>;
      })
      .then((data) => {
        if (data?.data?.translations) {
          setApiOverrides((prev) => ({
            ...prev,
            [locale]: data.data.translations,
          }));
        }
      })
      .catch(() => {
        // API not available — use static translations only
      });
  }, [apiBaseUrl, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-flatten translations with cache
  const flatCache = useRef<Record<string, FlatTranslations>>({});
  const getFlat = (loc: string): FlatTranslations => {
    if (!flatCache.current[loc] && translations[loc]) {
      flatCache.current[loc] = flattenTranslations(translations[loc]);
    }
    const staticFlat = flatCache.current[loc] ?? {};
    const dynamicFlat = apiOverrides[loc] ?? {};
    // Merge: dynamic (DB) overrides win over static defaults
    if (Object.keys(dynamicFlat).length > 0) {
      return { ...staticFlat, ...dynamicFlat };
    }
    return staticFlat;
  };

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(
        getFlat(locale),
        key,
        params,
        locale !== defaultLocale ? getFlat(defaultLocale) : undefined,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, defaultLocale, apiOverrides],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, supportedLocales: allLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}

export function useLocale() {
  return useTranslation().locale;
}

/** Simple language switcher dropdown */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, supportedLocales } = useTranslation();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className={className ?? 'rounded border bg-transparent px-2 py-1 text-sm'}
      aria-label="Select language"
    >
      {supportedLocales.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_FLAGS[loc] ?? '🌐'} {LOCALE_NAMES[loc] ?? loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
