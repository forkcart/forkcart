'use client';

import { useCurrency } from './currency-provider';

interface CurrencySwitcherProps {
  className?: string;
}

export function CurrencySwitcher({ className }: CurrencySwitcherProps) {
  const { currency, currencies, setCurrency } = useCurrency();

  if (currencies.length <= 1) return null;

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className={
        className ??
        'rounded-md border bg-transparent px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100'
      }
      aria-label="Select currency"
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
