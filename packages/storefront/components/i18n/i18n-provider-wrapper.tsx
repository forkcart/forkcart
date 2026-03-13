'use client';

import { I18nProvider } from '@forkcart/i18n/react';
import { storefrontTranslations, storefrontLocales } from '@forkcart/i18n/dist/_locales.generated';
import type { ReactNode } from 'react';

/**
 * Client-side i18n wrapper.
 * Auto-discovers all locales from packages/i18n/locales/*.json.
 * To add a language: just add xx.json to that folder and rebuild.
 */
export function I18nWrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider
      translations={storefrontTranslations}
      defaultLocale="en"
      supportedLocales={storefrontLocales}
    >
      {children}
    </I18nProvider>
  );
}
