/**
 * Exchange rate fetcher using free public APIs.
 * Primary: exchangerate-api.com (no key required)
 * Fallback: open.er-api.com
 */

interface RateResponse {
  rates: Record<string, number>;
}

/**
 * Fetch latest exchange rates relative to a base currency.
 * Returns a map of currency code → rate (e.g. { USD: 1.085, GBP: 0.856 }).
 */
export async function fetchLatestRates(baseCurrency: string): Promise<Record<string, number>> {
  const base = baseCurrency.toUpperCase();

  // Primary API
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    if (res.ok) {
      const data = (await res.json()) as RateResponse;
      return data.rates;
    }
  } catch {
    // fall through to fallback
  }

  // Fallback API
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (res.ok) {
      const data = (await res.json()) as RateResponse;
      return data.rates;
    }
  } catch {
    // fall through
  }

  throw new Error(`Failed to fetch exchange rates for ${base} from all providers`);
}
