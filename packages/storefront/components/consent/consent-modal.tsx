'use client';

import { useState, useEffect } from 'react';
import { useConsent, type ConsentState } from './consent-provider';
import { useTranslation } from '@forkcart/i18n/react';

export function ConsentModal() {
  const { showSettings, closeSettings, consent, categories, settings, saveChoices } = useConsent();
  const { t } = useTranslation();
  const [localChoices, setLocalChoices] = useState<ConsentState>({});

  // Sync local state when modal opens
  useEffect(() => {
    if (showSettings) {
      setLocalChoices({ ...consent });
    }
  }, [showSettings, consent]);

  if (!showSettings) return null;

  function toggleCategory(key: string) {
    setLocalChoices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    saveChoices(localChoices);
  }

  function handleAcceptAll() {
    const all: ConsentState = {};
    for (const cat of categories) {
      all[cat.key] = true;
    }
    saveChoices(all);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-lg animate-fade-in rounded-2xl border border-stone-200 bg-[#faf8f6] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-stone-800">
          {settings['modal_title'] ?? t('consent.modalTitle')}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{t('consent.modalDescription')}</p>

        {/* Categories */}
        <div className="mt-5 space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-stone-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-800">{cat.label}</span>
                    {cat.required && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-500">
                        {t('consent.required')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-400">{cat.description}</p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={cat.required || localChoices[cat.key]}
                  disabled={cat.required}
                  onClick={() => !cat.required && toggleCategory(cat.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 ${
                    cat.required
                      ? 'cursor-not-allowed bg-stone-300'
                      : localChoices[cat.key]
                        ? 'bg-stone-800'
                        : 'bg-stone-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                      cat.required || localChoices[cat.key]
                        ? 'translate-x-[22px]'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleSave}
            className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:scale-[0.98]"
          >
            {settings['modal_save'] ?? t('consent.save')}
          </button>
          <button
            onClick={handleAcceptAll}
            className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 active:scale-[0.98]"
          >
            {settings['banner_accept_all'] ?? t('consent.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
