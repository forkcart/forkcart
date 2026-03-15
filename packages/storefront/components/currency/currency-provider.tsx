'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
  exchangeRate: number;
}

interface CurrencyContextValue {
  /** Current selected currency code */
  currency: string;
  /** All available currencies */
  currencies: CurrencyInfo[];
  /** Set the active currency */
  setCurrency: (code: string) => void;
  /** Format a price in the current currency (converts from EUR base if needed) */
  formatPrice: (cents: number, fromCurrency?: string) => string;
  /** Convert a price from one currency to the current one */
  convertPrice: (cents: number, fromCurrency?: string) => number;
  /** Get current currency info */
  currentCurrency: CurrencyInfo | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('EUR');
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);

  // Load saved currency from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('forkcart_currency');
    if (saved) setCurrencyState(saved);

    // Fetch available currencies
    fetch(`${API_URL}/api/v1/public/currencies`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data: CurrencyInfo[] }>) : null))
      .then((data) => {
        if (data?.data?.length) {
          setCurrencies(data.data);
          // Validate saved currency is still active
          if (saved && !data.data.find((c) => c.code === saved)) {
            const def = data.data.find((c) => c.isDefault);
            setCurrencyState(def?.code ?? 'EUR');
          }
        }
      })
      .catch(() => {
        /* silent — use defaults */
      });
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem('forkcart_currency', code);
  }, []);

  const currentCurrency = currencies.find((c) => c.code === currency) ?? null;

  const convertPrice = useCallback(
    (cents: number, fromCurrency = 'EUR'): number => {
      if (fromCurrency === currency) return cents;

      const from = currencies.find((c) => c.code === fromCurrency);
      const to = currencies.find((c) => c.code === currency);

      if (!from || !to) return cents;

      return Math.round((cents * to.exchangeRate) / from.exchangeRate);
    },
    [currency, currencies],
  );

  const formatPrice = useCallback(
    (cents: number, fromCurrency = 'EUR'): string => {
      const convertedCents = convertPrice(cents, fromCurrency);
      const info = currentCurrency;
      const code = info?.code ?? currency;

      // Use Intl.NumberFormat for proper locale-aware formatting
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: info?.decimalPlaces ?? 2,
        maximumFractionDigits: info?.decimalPlaces ?? 2,
      }).format(convertedCents / 100);
    },
    [convertPrice, currentCurrency, currency],
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencies,
        setCurrency,
        formatPrice,
        convertPrice,
        currentCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
