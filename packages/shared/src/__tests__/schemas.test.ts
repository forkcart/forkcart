import { describe, it, expect } from 'vitest';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductFilterSchema,
  ProductStatusSchema,
  CreateProductVariantSchema,
  PaginationSchema,
  MoneySchema,
} from '../index';

// ── ProductStatusSchema ────────────────────────────────────────────

describe('ProductStatusSchema', () => {
  it.each(['draft', 'active', 'archived'])('accepts valid status: %s', (status) => {
    expect(ProductStatusSchema.parse(status)).toBe(status);
  });

  it('rejects invalid status', () => {
    expect(() => ProductStatusSchema.parse('deleted')).toThrow();
  });
});

// ── CreateProductSchema ────────────────────────────────────────────

describe('CreateProductSchema', () => {
  const validProduct = {
    name: 'Test Product',
    slug: 'test-product',
    price: 1999,
    categoryIds: [],
  };

  it('accepts valid product', () => {
    const result = CreateProductSchema.parse(validProduct);
    expect(result.name).toBe('Test Product');
    expect(result.slug).toBe('test-product');
    expect(result.price).toBe(1999);
    expect(result.status).toBe('draft'); // default
    expect(result.currency).toBe('EUR'); // default
    expect(result.trackInventory).toBe(true); // default
  });

  it('accepts all optional fields', () => {
    const full = {
      ...validProduct,
      description: 'A great product',
      shortDescription: 'Great',
      sku: 'SKU-001',
      status: 'active',
      compareAtPrice: 2999,
      costPrice: 500,
      currency: 'USD',
      trackInventory: false,
      inventoryQuantity: 50,
      weight: 100,
      weightUnit: 'g',
      categoryIds: ['550e8400-e29b-41d4-a716-446655440000'],
      metadata: { featured: true },
    };
    const result = CreateProductSchema.parse(full);
    expect(result.status).toBe('active');
    expect(result.description).toBe('A great product');
  });

  it('rejects empty name', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, name: '' })).toThrow();
  });

  it('rejects name exceeding 255 chars', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, name: 'x'.repeat(256) })).toThrow();
  });

  it('rejects invalid slug format', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, slug: 'Invalid Slug!' })).toThrow();
  });

  it('rejects slug with uppercase', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, slug: 'UPPER-case' })).toThrow();
  });

  it('accepts valid slug patterns', () => {
    expect(CreateProductSchema.parse({ ...validProduct, slug: 'my-product-123' }).slug).toBe(
      'my-product-123',
    );
  });

  it('rejects negative price', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, price: -1 })).toThrow();
  });

  it('rejects non-integer price', () => {
    expect(() => CreateProductSchema.parse({ ...validProduct, price: 19.99 })).toThrow();
  });

  it('accepts zero price', () => {
    expect(CreateProductSchema.parse({ ...validProduct, price: 0 }).price).toBe(0);
  });

  it('rejects description exceeding 10000 chars', () => {
    expect(() =>
      CreateProductSchema.parse({ ...validProduct, description: 'x'.repeat(10001) }),
    ).toThrow();
  });

  it('rejects non-uuid categoryIds', () => {
    expect(() =>
      CreateProductSchema.parse({ ...validProduct, categoryIds: ['not-a-uuid'] }),
    ).toThrow();
  });
});

// ── UpdateProductSchema ────────────────────────────────────────────

describe('UpdateProductSchema', () => {
  it('accepts partial updates', () => {
    const result = UpdateProductSchema.parse({ name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(result.price).toBeUndefined();
  });

  it('accepts empty object (no changes)', () => {
    const result = UpdateProductSchema.parse({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ── ProductFilterSchema ────────────────────────────────────────────

describe('ProductFilterSchema', () => {
  it('provides defaults for sortBy and sortDirection', () => {
    const result = ProductFilterSchema.parse({});
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortDirection).toBe('desc');
  });

  it('accepts all filter fields', () => {
    const result = ProductFilterSchema.parse({
      status: 'active',
      search: 'widget',
      minPrice: 100,
      maxPrice: 5000,
      sortBy: 'price',
      sortDirection: 'asc',
    });
    expect(result.status).toBe('active');
    expect(result.minPrice).toBe(100);
  });

  it('rejects invalid sortBy', () => {
    expect(() => ProductFilterSchema.parse({ sortBy: 'invalid' })).toThrow();
  });

  it('coerces string prices to numbers', () => {
    const result = ProductFilterSchema.parse({ minPrice: '100' });
    expect(result.minPrice).toBe(100);
  });
});

// ── CreateProductVariantSchema ─────────────────────────────────────

describe('CreateProductVariantSchema', () => {
  const validVariant = {
    productId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Size M',
  };

  it('accepts valid variant', () => {
    const result = CreateProductVariantSchema.parse(validVariant);
    expect(result.name).toBe('Size M');
    expect(result.inventoryQuantity).toBe(0); // default
    expect(result.attributes).toEqual({}); // default
    expect(result.sortOrder).toBe(0); // default
  });

  it('accepts variant with price override', () => {
    const result = CreateProductVariantSchema.parse({ ...validVariant, price: 2499 });
    expect(result.price).toBe(2499);
  });

  it('accepts variant with attributes', () => {
    const result = CreateProductVariantSchema.parse({
      ...validVariant,
      attributes: { size: 'M', color: 'Red' },
    });
    expect(result.attributes).toEqual({ size: 'M', color: 'Red' });
  });

  it('rejects empty name', () => {
    expect(() => CreateProductVariantSchema.parse({ ...validVariant, name: '' })).toThrow();
  });

  it('rejects non-uuid productId', () => {
    expect(() =>
      CreateProductVariantSchema.parse({ ...validVariant, productId: 'not-uuid' }),
    ).toThrow();
  });

  it('rejects negative price', () => {
    expect(() => CreateProductVariantSchema.parse({ ...validVariant, price: -100 })).toThrow();
  });
});

// ── PaginationSchema ───────────────────────────────────────────────

describe('PaginationSchema', () => {
  it('provides defaults', () => {
    const result = PaginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces strings to numbers', () => {
    const result = PaginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page < 1', () => {
    expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
  });

  it('rejects limit > 100', () => {
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
  });

  it('rejects limit < 1', () => {
    expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
  });
});

// ── MoneySchema ────────────────────────────────────────────────────

describe('MoneySchema', () => {
  it('accepts valid money', () => {
    const result = MoneySchema.parse({ amount: 1999 });
    expect(result.amount).toBe(1999);
    expect(result.currency).toBe('EUR'); // default
  });

  it('accepts explicit currency', () => {
    const result = MoneySchema.parse({ amount: 500, currency: 'USD' });
    expect(result.currency).toBe('USD');
  });

  it('rejects non-integer amount', () => {
    expect(() => MoneySchema.parse({ amount: 19.99 })).toThrow();
  });

  it('rejects invalid currency length', () => {
    expect(() => MoneySchema.parse({ amount: 100, currency: 'EURO' })).toThrow();
    expect(() => MoneySchema.parse({ amount: 100, currency: 'EU' })).toThrow();
  });
});
