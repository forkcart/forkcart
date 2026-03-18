'use client';

import { useContext } from 'react';
import { ConsentContext } from './consent-provider';

export function CookieSettingsLink() {
  const ctx = useContext(ConsentContext);

  // During SSG or outside provider, render nothing interactive
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={ctx.openSettings}
      className="text-sm text-gray-500 transition hover:text-gray-900"
    >
      Cookie-Einstellungen
    </button>
  );
}
