'use client';

import { useState, useEffect } from 'react';
import { I18nProvider } from '@forkcart/i18n/react';
import { storefrontTranslations, storefrontLocales } from '@forkcart/i18n/generated';
import type { ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TRANSLATIONS_URL = `${API_BASE_URL}/api/v1/public/translations`;

/**
 * Client-side i18n wrapper.
 * Fetches the shop's default language from the API, then falls back to 'en'.
 */
export function I18nWrapper({ children }: { children: ReactNode }) {
  const [defaultLocale, setDefaultLocale] = useState('en');

  useEffect(() => {
    fetch(TRANSLATIONS_URL)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ data: Array<{ locale: string; isDefault?: boolean }> }>)
          : null,
      )
      .then((json) => {
        const def = json?.data?.find((l) => l.isDefault);
        if (def) setDefaultLocale(def.locale);
      })
      .catch((error: unknown) => {
        // Intentionally silent: fallback locale will be used
        console.error('[I18nProvider] Failed to fetch default locale:', error);
      });
  }, []);

  return (
    <I18nProvider
      translations={storefrontTranslations}
      defaultLocale={defaultLocale}
      supportedLocales={storefrontLocales}
      apiBaseUrl={TRANSLATIONS_URL}
    >
      {children}
    </I18nProvider>
  );
}
