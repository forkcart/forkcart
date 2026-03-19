import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../service';
import { NotFoundError, ConflictError, ValidationError } from '@forkcart/shared';
import { EventBus } from '../../plugins/event-bus';
import { PRODUCT_EVENTS } from '../events';

// ── helpers ──────────────────────────────────────────────────────────

function fakeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product',
    price: 1999,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepo() {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    existsBySlug: vi.fn(),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe('ProductService', () => {
  let service: ProductService;
  let repo: ReturnType<typeof createMockRepo>;
  let eventBus: EventBus;

  beforeEach(() => {
    repo = createMockRepo();
    eventBus = new EventBus();
    vi.spyOn(eventBus, 'emit');
    service = new ProductService({
      productRepository: repo as never,
      eventBus,
    });
  });

  // ── getById ──────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the product when found', async () => {
      const product = fakeProduct();
      repo.findById.mockResolvedValue(product);

      const result = await service.getById('prod-1');
      expect(result).toEqual(product);
      expect(repo.findById).toHaveBeenCalledWith('prod-1');
    });

    it('throws NotFoundError when product does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  // ── getBySlug ────────────────────────────────────────────────────

  describe('getBySlug', () => {
    it('returns the product when found by slug', async () => {
      const product = fakeProduct();
      repo.findBySlug.mockResolvedValue(product);

      const result = await service.getBySlug('test-product');
      expect(result).toEqual(product);
      expect(repo.findBySlug).toHaveBeenCalledWith('test-product');
    });

    it('throws NotFoundError when slug does not exist', async () => {
      repo.findBySlug.mockResolvedValue(null);

      await expect(service.getBySlug('nope')).rejects.toThrow(NotFoundError);
    });
  });

  // ── list ─────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated product list', async () => {
      const products = [fakeProduct(), fakeProduct({ id: 'prod-2', slug: 'second' })];
      const paginationMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };
      repo.findMany.mockResolvedValue({ data: products, pagination: paginationMeta });

      const filter = { sortBy: 'createdAt' as const, sortDirection: 'desc' as const };
      const pagination = { page: 1, limit: 20 };

      const result = await service.list(filter, pagination);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(repo.findMany).toHaveBeenCalledWith(filter, pagination);
    });

    it('returns empty list when no products match', async () => {
      repo.findMany.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const result = await service.list(
        { sortBy: 'createdAt' as const, sortDirection: 'desc' as const },
        { page: 1, limit: 20 },
      );
      expect(result.data).toHaveLength(0);
    });
  });

  // ── create ───────────────────────────────────────────────────────

  describe('create', () => {
    const input = {
      name: 'New Product',
      slug: 'new-product',
      price: 2999,
      status: 'draft' as const,
      currency: 'EUR',
      trackInventory: true,
      inventoryQuantity: 10,
      weightUnit: 'g' as const,
      categoryIds: [],
    };

    it('creates a product and emits CREATED event', async () => {
      repo.existsBySlug.mockResolvedValue(false);
      const created = fakeProduct({ ...input, id: 'prod-new' });
      repo.create.mockResolvedValue(created);

      const result = await service.create(input);

      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalledWith(input);
      expect(eventBus.emit).toHaveBeenCalledWith(PRODUCT_EVENTS.CREATED, { product: created });
    });

    it('throws ConflictError when slug already exists', async () => {
      repo.existsBySlug.mockResolvedValue(true);

      await expect(service.create(input)).rejects.toThrow(ConflictError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws ValidationError when compareAtPrice <= price', async () => {
      repo.existsBySlug.mockResolvedValue(false);

      await expect(service.create({ ...input, compareAtPrice: 2999 })).rejects.toThrow(
        ValidationError,
      );

      await expect(service.create({ ...input, compareAtPrice: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('allows compareAtPrice higher than price', async () => {
      repo.existsBySlug.mockResolvedValue(false);
      repo.create.mockResolvedValue(fakeProduct({ compareAtPrice: 3999 }));

      const result = await service.create({ ...input, compareAtPrice: 3999 });
      expect(result.compareAtPrice).toBe(3999);
    });
  });

  // ── update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('updates a product and emits UPDATED event', async () => {
      repo.existsBySlug.mockResolvedValue(false);
      const updated = fakeProduct({ name: 'Updated' });
      repo.update.mockResolvedValue(updated);

      const result = await service.update('prod-1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(eventBus.emit).toHaveBeenCalledWith(PRODUCT_EVENTS.UPDATED, { product: updated });
    });

    it('throws NotFoundError when product does not exist', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when slug conflicts with another product', async () => {
      repo.existsBySlug.mockResolvedValue(true);

      await expect(service.update('prod-1', { slug: 'taken' })).rejects.toThrow(ConflictError);
    });

    it('checks slug with excludeId', async () => {
      repo.existsBySlug.mockResolvedValue(false);
      repo.update.mockResolvedValue(fakeProduct({ slug: 'new-slug' }));

      await service.update('prod-1', { slug: 'new-slug' });
      expect(repo.existsBySlug).toHaveBeenCalledWith('new-slug', 'prod-1');
    });

    it('throws ValidationError when compareAtPrice <= price in update', async () => {
      await expect(service.update('prod-1', { price: 2000, compareAtPrice: 1000 })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  // ── delete ───────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes a product and emits DELETED event', async () => {
      const product = fakeProduct();
      repo.findById.mockResolvedValue(product);
      repo.delete.mockResolvedValue(true);

      const result = await service.delete('prod-1');

      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith('prod-1');
      expect(eventBus.emit).toHaveBeenCalledWith(PRODUCT_EVENTS.DELETED, { product });
    });

    it('throws NotFoundError when product does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(NotFoundError);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  // ── plugin filters ───────────────────────────────────────────────

  describe('plugin filters', () => {
    it('applies price/title/description filters when pluginLoader is set', async () => {
      const pluginLoader = {
        applyFilters: vi.fn().mockImplementation((_hook: string, value: unknown) => {
          if (typeof value === 'number') return value + 100;
          if (typeof value === 'string') return `[filtered] ${value}`;
          return value;
        }),
      };

      service.setPluginLoader(pluginLoader as never);

      const product = fakeProduct({ name: 'Widget', description: 'Nice', price: 1000 });
      repo.findById.mockResolvedValue(product);

      const result = await service.getById('prod-1');
      expect(result.price).toBe(1100);
      expect(result.name).toBe('[filtered] Widget');
      expect(result.description).toBe('[filtered] Nice');
    });
  });
});
