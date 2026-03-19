import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariantService } from '../service';
import { NotFoundError } from '@forkcart/shared';

// ── helpers ──────────────────────────────────────────────────────────

function fakeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'var-1',
    productId: 'prod-1',
    name: 'Size M',
    sku: null as string | null,
    price: null as number | null,
    inventoryQuantity: 0,
    attributes: {} as Record<string, string>,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepo() {
  return {
    findByProductId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByProductId: vi.fn(),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe('VariantService', () => {
  let service: VariantService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new VariantService({ variantRepository: repo as never });
  });

  // ── create ───────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a variant with size attribute', async () => {
      const variant = fakeVariant({ attributes: { size: 'M' } });
      repo.create.mockResolvedValue(variant);

      const result = await service.create({
        productId: 'prod-1',
        name: 'Size M',
        attributes: { size: 'M' },
      });

      expect(result).toEqual(variant);
      expect(repo.create).toHaveBeenCalledWith({
        productId: 'prod-1',
        name: 'Size M',
        attributes: { size: 'M' },
      });
    });

    it('creates a variant with color attribute', async () => {
      const variant = fakeVariant({ name: 'Red', attributes: { color: 'Red' } });
      repo.create.mockResolvedValue(variant);

      const result = await service.create({
        productId: 'prod-1',
        name: 'Red',
        attributes: { color: 'Red' },
      });

      expect(result.attributes).toEqual({ color: 'Red' });
    });

    it('creates a variant with price override', async () => {
      const variant = fakeVariant({ price: 2499 });
      repo.create.mockResolvedValue(variant);

      const result = await service.create({
        productId: 'prod-1',
        name: 'Premium',
        price: 2499,
      });

      expect(result.price).toBe(2499);
    });
  });

  // ── createMany ───────────────────────────────────────────────────

  describe('createMany', () => {
    it('batch-creates multiple variants', async () => {
      const variants = [
        fakeVariant({ id: 'var-1', name: 'S' }),
        fakeVariant({ id: 'var-2', name: 'M' }),
        fakeVariant({ id: 'var-3', name: 'L' }),
      ];
      repo.createMany.mockResolvedValue(variants);

      const items = [
        { productId: 'prod-1', name: 'S' },
        { productId: 'prod-1', name: 'M' },
        { productId: 'prod-1', name: 'L' },
      ];

      const result = await service.createMany(items);
      expect(result).toHaveLength(3);
    });
  });

  // ── getById ──────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns variant when found', async () => {
      const variant = fakeVariant();
      repo.findById.mockResolvedValue(variant);

      expect(await service.getById('var-1')).toEqual(variant);
    });

    it('throws NotFoundError when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  // ── listByProduct ────────────────────────────────────────────────

  describe('listByProduct', () => {
    it('returns all variants for a product', async () => {
      const variants = [fakeVariant({ id: 'v1' }), fakeVariant({ id: 'v2' })];
      repo.findByProductId.mockResolvedValue(variants);

      const result = await service.listByProduct('prod-1');
      expect(result).toHaveLength(2);
      expect(repo.findByProductId).toHaveBeenCalledWith('prod-1');
    });
  });

  // ── update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('updates a variant with price override', async () => {
      repo.findById.mockResolvedValue(fakeVariant());
      const updated = fakeVariant({ price: 3999 });
      repo.update.mockResolvedValue(updated);

      const result = await service.update('var-1', { price: 3999 });
      expect(result!.price).toBe(3999);
    });

    it('throws NotFoundError when variant does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  // ── delete ───────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes an existing variant', async () => {
      repo.findById.mockResolvedValue(fakeVariant());
      repo.delete.mockResolvedValue(undefined);

      await expect(service.delete('var-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundError when variant does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('missing')).rejects.toThrow(NotFoundError);
    });
  });

  // ── deleteByProductId ────────────────────────────────────────────

  describe('deleteByProductId', () => {
    it('deletes all variants for a product', async () => {
      repo.deleteByProductId.mockResolvedValue(undefined);

      await service.deleteByProductId('prod-1');
      expect(repo.deleteByProductId).toHaveBeenCalledWith('prod-1');
    });
  });

  // ── generateVariants ─────────────────────────────────────────────

  describe('generateVariants', () => {
    it('generates cartesian product of attribute selections', async () => {
      repo.createMany.mockImplementation((items: unknown[]) => items);

      const selections = [
        { name: 'Size', values: ['S', 'M', 'L'] },
        { name: 'Color', values: ['Red', 'Blue'] },
      ];

      const result = await service.generateVariants('prod-1', selections);

      // 3 sizes × 2 colors = 6 variants
      expect(result).toHaveLength(6);

      const names = (result as Array<{ name: string }>).map((v) => v.name);
      expect(names).toContain('S / Red');
      expect(names).toContain('S / Blue');
      expect(names).toContain('M / Red');
      expect(names).toContain('L / Blue');
    });

    it('handles single attribute selection', async () => {
      repo.createMany.mockImplementation((items: unknown[]) => items);

      const result = await service.generateVariants('prod-1', [
        { name: 'Size', values: ['S', 'M'] },
      ]);

      expect(result).toHaveLength(2);
    });

    it('handles empty selections', async () => {
      repo.createMany.mockImplementation((items: unknown[]) => items);

      const result = await service.generateVariants('prod-1', []);
      expect(result).toHaveLength(1); // Empty combination
    });
  });
});
