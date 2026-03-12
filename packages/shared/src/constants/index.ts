/** Supported currencies */
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Default currency */
export const DEFAULT_CURRENCY: Currency = 'EUR';

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Weight units */
export const WEIGHT_UNITS = ['g', 'kg', 'lb', 'oz'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** Session cookie name */
export const SESSION_COOKIE_NAME = 'forkcart_session';

/** API version */
export const API_VERSION = 'v1';
