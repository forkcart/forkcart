'use client';

import { I18nProvider } from '@forkcart/i18n/react';
import { storefrontTranslations, storefrontLocales } from '@forkcart/i18n/generated';
import type { ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Client-side i18n wrapper.
 * Auto-discovers all locales from packages/i18n/locales/*.json.
 * Fetches dynamic translation overrides from the API.
 * To add a language: just add xx.json to that folder and rebuild.
 */
export function I18nWrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider
      translations={storefrontTranslations}
      defaultLocale="en"
      supportedLocales={storefrontLocales}
      apiBaseUrl={`${API_BASE_URL}/api/v1/public/translations`}
    >
      {children}
    </I18nProvider>
  );
}
