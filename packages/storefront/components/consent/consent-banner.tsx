'use client';

import { useConsent } from './consent-provider';

export function ConsentBanner() {
  const { showBanner, settings, categories, acceptAll, rejectAll, openSettings } = useConsent();

  if (!showBanner || categories.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-stone-200 bg-[#faf8f6] p-6 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Text */}
            <div className="flex-1">
              <h3 className="text-base font-semibold text-stone-800">
                {settings['banner_title'] ?? 'Wir respektieren Ihre Privatsphäre'}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
                {settings['banner_text'] ??
                  'Wir verwenden Cookies, um Ihnen das beste Einkaufserlebnis zu bieten.'}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={rejectAll}
                className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98]"
              >
                {settings['banner_reject_all'] ?? 'Nur notwendige'}
              </button>
              <button
                onClick={openSettings}
                className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98]"
              >
                {settings['banner_settings'] ?? 'Einstellungen'}
              </button>
              <button
                onClick={acceptAll}
                className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 active:scale-[0.98]"
              >
                {settings['banner_accept_all'] ?? 'Alle akzeptieren'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
