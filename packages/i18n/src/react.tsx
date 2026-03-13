import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  translate,
  flattenTranslations,
  type FlatTranslations,
  type TranslationDict,
  type Locale,
} from './index';

// Native language names for the switcher
const LOCALE_NAMES: Record<string, string> = {
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
};

const LOCALE_FLAGS: Record<string, string> = {
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
}

export function I18nProvider({
  children,
  defaultLocale = 'en',
  supportedLocales = ['en'],
  translations,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forkcart_locale');
      if (stored && supportedLocales.includes(stored)) return stored;
      const browserLang = navigator.language.split('-')[0]!;
      if (supportedLocales.includes(browserLang)) return browserLang;
    }
    return defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forkcart_locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Pre-flatten translations with cache
  const flatCache = useRef<Record<string, FlatTranslations>>({});
  const getFlat = (loc: string): FlatTranslations => {
    if (!flatCache.current[loc] && translations[loc]) {
      flatCache.current[loc] = flattenTranslations(translations[loc]);
    }
    return flatCache.current[loc] ?? {};
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
    [locale, defaultLocale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, supportedLocales }}>
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
          {LOCALE_FLAGS[loc] ?? ''} {LOCALE_NAMES[loc] ?? loc}
        </option>
      ))}
    </select>
  );
}
