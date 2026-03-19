import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  slugify,
  priceToCents,
  calculatePagination,
  typedKeys,
  omitUndefined,
  generateOrderNumber,
} from '../index';

// ── formatPrice (extended) ─────────────────────────────────────────

describe('formatPrice', () => {
  it('formats cents to EUR', () => {
    const result = formatPrice(1299);
    expect(result).toContain('12');
    expect(result).toContain('99');
  });

  it('formats zero', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
  });

  it('returns a string', () => {
    expect(typeof formatPrice(999)).toBe('string');
  });

  it('formats large amounts', () => {
    const result = formatPrice(999999);
    expect(result).toContain('9.999');
  });

  it('formats negative amounts', () => {
    const result = formatPrice(-500);
    expect(result).toContain('5');
  });

  it('uses USD when specified', () => {
    const result = formatPrice(1000, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('10');
  });

  it('uses GBP when specified', () => {
    const result = formatPrice(1000, 'GBP', 'en-GB');
    expect(result).toContain('£');
  });

  it('formats single cent correctly', () => {
    const result = formatPrice(1);
    expect(result).toContain('0,01');
  });
});

// ── slugify ────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles underscores', () => {
    expect(slugify('foo_bar')).toBe('foo-bar');
  });

  it('handles German umlauts (strips them)', () => {
    // Umlauts are non-word chars, so they get removed
    expect(slugify('Über cool')).toBe('ber-cool');
  });
});

// ── priceToCents ───────────────────────────────────────────────────

describe('priceToCents', () => {
  it('converts whole euros to cents', () => {
    expect(priceToCents(10)).toBe(1000);
  });

  it('converts decimal prices to cents', () => {
    expect(priceToCents(19.99)).toBe(1999);
  });

  it('handles zero', () => {
    expect(priceToCents(0)).toBe(0);
  });

  it('rounds floating point edge cases', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    expect(priceToCents(0.1 + 0.2)).toBe(30);
  });

  it('handles small values', () => {
    expect(priceToCents(0.01)).toBe(1);
  });
});

// ── calculatePagination ────────────────────────────────────────────

describe('calculatePagination', () => {
  it('calculates basic pagination', () => {
    const result = calculatePagination(100, 1, 20);
    expect(result).toEqual({ page: 1, limit: 20, total: 100, totalPages: 5 });
  });

  it('handles partial last page', () => {
    const result = calculatePagination(21, 1, 20);
    expect(result.totalPages).toBe(2);
  });

  it('handles zero total', () => {
    const result = calculatePagination(0, 1, 20);
    expect(result.totalPages).toBe(0);
  });

  it('handles single item', () => {
    const result = calculatePagination(1, 1, 20);
    expect(result.totalPages).toBe(1);
  });

  it('handles exact fit', () => {
    const result = calculatePagination(40, 2, 20);
    expect(result).toEqual({ page: 2, limit: 20, total: 40, totalPages: 2 });
  });
});

// ── typedKeys ──────────────────────────────────────────────────────

describe('typedKeys', () => {
  it('returns keys of an object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(typedKeys(obj)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty object', () => {
    expect(typedKeys({})).toEqual([]);
  });
});

// ── omitUndefined ──────────────────────────────────────────────────

describe('omitUndefined', () => {
  it('removes undefined values', () => {
    const result = omitUndefined({ a: 1, b: undefined, c: 'hello' });
    expect(result).toEqual({ a: 1, c: 'hello' });
  });

  it('keeps null values', () => {
    const result = omitUndefined({ a: null, b: undefined });
    expect(result).toEqual({ a: null });
  });

  it('returns empty object when all undefined', () => {
    const result = omitUndefined({ a: undefined, b: undefined });
    expect(result).toEqual({});
  });

  it('returns full object when nothing undefined', () => {
    const result = omitUndefined({ a: 1, b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

// ── generateOrderNumber ────────────────────────────────────────────

describe('generateOrderNumber', () => {
  it('starts with FC-', () => {
    expect(generateOrderNumber()).toMatch(/^FC-/);
  });

  it('generates unique numbers', () => {
    const numbers = new Set(Array.from({ length: 50 }, () => generateOrderNumber()));
    // Should be mostly unique (random component)
    expect(numbers.size).toBeGreaterThan(40);
  });

  it('is all uppercase', () => {
    const num = generateOrderNumber();
    expect(num).toBe(num.toUpperCase());
  });
});
