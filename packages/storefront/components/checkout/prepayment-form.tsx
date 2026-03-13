'use client';

import { useState } from 'react';
import { Lock, Loader2, Banknote } from 'lucide-react';
import { useTranslation } from '@forkcart/i18n/react';

interface PrepaymentFormProps {
  onSubmit: () => Promise<void>;
}

export function PrepaymentForm({ onSubmit }: PrepaymentFormProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    try {
      await onSubmit();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Banknote className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">{t('checkout.prepayment.title')}</h3>
            <p className="mt-1 text-sm text-amber-700">{t('checkout.prepayment.description')}</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={processing}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {processing ? t('checkout.prepayment.creating') : t('checkout.prepayment.placeOrder')}
      </button>
    </form>
  );
}
