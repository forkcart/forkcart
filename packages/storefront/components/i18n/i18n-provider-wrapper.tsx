'use client';

import { useEffect } from 'react';
import { I18nProvider } from '@forkcart/i18n/react';
import { storefrontTranslations, storefrontLocales } from '@forkcart/i18n/generated';
import type { ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TRANSLATIONS_URL = `${API_BASE_URL}/api/v1/public/translations`;

interface Props {
  children: ReactNode;
  locale: string;
}

export function I18nWrapper({ children, locale }: Props) {
  // Sync localStorage with URL-based locale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forkcart_locale', locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <I18nProvider
      translations={storefrontTranslations}
      defaultLocale={locale}
      supportedLocales={storefrontLocales}
      apiBaseUrl={TRANSLATIONS_URL}
      initialLocale={locale}
    >
      {children}
    </I18nProvider>
  );
}
