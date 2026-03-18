'use client';

import { useContext } from 'react';
import { ConsentContext } from './consent-provider';
import { useTranslation } from '@forkcart/i18n/react';

export function CookieSettingsLink() {
  const ctx = useContext(ConsentContext);
  const { t } = useTranslation();

  // During SSG or outside provider, render nothing interactive
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={ctx.openSettings}
      className="text-sm text-gray-500 transition hover:text-gray-900"
    >
      {t('consent.cookieSettings')}
    </button>
  );
}
