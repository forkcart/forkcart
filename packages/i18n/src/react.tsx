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

/** Country code for flag CDN (locale → ISO 3166-1 alpha-2) */
const LOCALE_COUNTRY: Record<string, string> = {
  en: 'gb',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  pt: 'pt',
  pl: 'pl',
  cs: 'cz',
  ja: 'jp',
  zh: 'cn',
  ko: 'kr',
  ar: 'sa',
  ru: 'ru',
  tr: 'tr',
  sv: 'se',
  da: 'dk',
  fi: 'fi',
  no: 'no',
  hu: 'hu',
  ro: 'ro',
  uk: 'ua',
  el: 'gr',
  th: 'th',
  vi: 'vn',
  hi: 'in',
};

/** Get flag image URL for a locale */
export function getFlagUrl(locale: string, size: 'w20' | 'w40' | 'w80' = 'w40'): string {
  const country = LOCALE_COUNTRY[locale] ?? locale;
  return `https://flagcdn.com/${size}/${country}.png`;
}

/** Flag image component */
export function Flag({
  locale,
  size = 20,
  className,
}: {
  locale: string;
  size?: number;
  className?: string;
}) {
  const cdnSize = size <= 20 ? 'w20' : size <= 40 ? 'w40' : 'w80';
  const country = LOCALE_COUNTRY[locale] ?? locale;
  const name = LOCALE_NAMES[locale] ?? locale.toUpperCase();
  return (
    <img
      src={`https://flagcdn.com/${cdnSize}/${country}.png`}
      srcSet={`https://flagcdn.com/${cdnSize === 'w20' ? 'w40' : 'w80'}/${country}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={name}
      className={className ?? 'inline-block rounded-sm'}
      loading="lazy"
    />
  );
}

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

/** Language switcher with flag dropdown */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, supportedLocales } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border bg-transparent px-2.5 py-1.5 text-sm transition hover:bg-gray-100"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Flag locale={locale} size={18} />
        &nbsp;
        <span className="text-xs font-medium uppercase text-gray-600">{locale}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border bg-white py-1 shadow-lg">
          {supportedLocales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setLocale(loc);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
                loc === locale ? 'bg-gray-50 font-medium' : 'text-gray-600'
              }`}
            >
              <Flag locale={loc} size={18} />
              &nbsp;
              <span>{LOCALE_NAMES[loc] ?? loc.toUpperCase()}</span>
              {loc === locale && (
                <svg
                  className="ml-auto h-4 w-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
