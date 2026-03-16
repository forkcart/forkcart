import { config } from './config';

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(config.currencyLocale, {
    style: 'currency',
    currency: config.currency,
  }).format(amount / 100);
}
