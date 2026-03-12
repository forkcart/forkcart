import { describe, it, expect } from 'vitest';
import { formatPrice } from '../index';

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
});
