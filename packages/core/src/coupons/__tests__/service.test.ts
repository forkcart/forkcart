import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponService } from '../service';
import { NotFoundError, ValidationError } from '@forkcart/shared';

// ── helpers ──────────────────────────────────────────────────────────

function fakeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    enabled: true,
    usedCount: 0,
    maxUses: null as number | null,
    maxUsesPerCustomer: null as number | null,
    minOrderAmount: null as number | null,
    startsAt: null as Date | null,
    expiresAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepo() {
  return {
    findById: vi.fn(),
    findByCode: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementUsage: vi.fn(),
    validateAndIncrementUsage: vi.fn(),
    getCustomerUsageCount: vi.fn().mockResolvedValue(0),
    recordCustomerUsage: vi.fn().mockResolvedValue(undefined),
  };
}

// ── tests ────────────────────────────────────────────────────────────

describe('CouponService', () => {
  let service: CouponService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new CouponService({ couponRepository: repo as never });
  });

  // ── CRUD ─────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a percentage coupon', async () => {
      repo.findByCode.mockResolvedValue(null);
      const coupon = fakeCoupon();
      repo.create.mockResolvedValue(coupon);

      const result = await service.create({ code: 'SAVE10', type: 'percentage', value: 10 });
      expect(result).toEqual(coupon);
      expect(repo.create).toHaveBeenCalledWith({ code: 'SAVE10', type: 'percentage', value: 10 });
    });

    it('creates a fixed_amount coupon', async () => {
      repo.findByCode.mockResolvedValue(null);
      const coupon = fakeCoupon({ type: 'fixed_amount', value: 500 });
      repo.create.mockResolvedValue(coupon);

      const result = await service.create({ code: 'FLAT5', type: 'fixed_amount', value: 500 });
      expect(result.type).toBe('fixed_amount');
      expect(result.value).toBe(500);
    });

    it('throws ValidationError when code already exists', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon());

      await expect(
        service.create({ code: 'SAVE10', type: 'percentage', value: 10 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('returns coupon when found', async () => {
      const coupon = fakeCoupon();
      repo.findById.mockResolvedValue(coupon);

      expect(await service.getById('coupon-1')).toEqual(coupon);
    });

    it('throws NotFoundError when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('updates a coupon', async () => {
      repo.findById.mockResolvedValue(fakeCoupon());
      const updated = fakeCoupon({ value: 20 });
      repo.update.mockResolvedValue(updated);

      const result = await service.update('coupon-1', { value: 20 });
      expect(result.value).toBe(20);
    });

    it('throws NotFoundError if coupon does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { value: 20 })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError if new code conflicts', async () => {
      repo.findById.mockResolvedValue(fakeCoupon({ code: 'OLD' }));
      repo.findByCode.mockResolvedValue(fakeCoupon({ id: 'other', code: 'TAKEN' }));

      await expect(service.update('coupon-1', { code: 'TAKEN' })).rejects.toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('deletes an existing coupon', async () => {
      repo.findById.mockResolvedValue(fakeCoupon());
      repo.delete.mockResolvedValue(undefined);

      await expect(service.delete('coupon-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundError when deleting non-existent coupon', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('missing')).rejects.toThrow(NotFoundError);
    });
  });

  // ── validate ─────────────────────────────────────────────────────

  describe('validate', () => {
    it('returns valid for an active percentage coupon', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ type: 'percentage', value: 10 }));

      const result = await service.validate('SAVE10', 10000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(1000); // 10% of 10000
      expect(result.type).toBe('percentage');
    });

    it('returns valid for a fixed_amount coupon', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ type: 'fixed_amount', value: 500 }));

      const result = await service.validate('FLAT5', 10000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(500);
    });

    it('caps fixed_amount discount at cart total', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ type: 'fixed_amount', value: 5000 }));

      const result = await service.validate('BIG', 2000);
      expect(result.discount).toBe(2000);
    });

    it('caps percentage discount at cart total', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ type: 'percentage', value: 100 }));

      const result = await service.validate('FULL', 5000);
      expect(result.discount).toBe(5000);
    });

    it('returns invalid for unknown coupon code', async () => {
      repo.findByCode.mockResolvedValue(null);

      const result = await service.validate('NOPE', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon not found');
    });

    it('returns invalid for disabled coupon', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ enabled: false }));

      const result = await service.validate('SAVE10', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is disabled');
    });

    it('returns invalid for expired coupon', async () => {
      const expired = new Date('2020-01-01');
      repo.findByCode.mockResolvedValue(fakeCoupon({ expiresAt: expired }));

      const result = await service.validate('OLD', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon has expired');
    });

    it('returns invalid when coupon is not yet active', async () => {
      const future = new Date('2099-01-01');
      repo.findByCode.mockResolvedValue(fakeCoupon({ startsAt: future }));

      const result = await service.validate('FUTURE', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is not yet active');
    });

    it('returns invalid when usage limit is reached', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ maxUses: 5, usedCount: 5 }));

      const result = await service.validate('USED', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon usage limit reached');
    });

    it('returns invalid when min order amount is not met', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ minOrderAmount: 5000 }));

      const result = await service.validate('MIN', 2000);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Minimum order amount');
    });

    it('returns invalid when per-customer limit exceeded', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ maxUsesPerCustomer: 1 }));
      repo.getCustomerUsageCount.mockResolvedValue(1);

      const result = await service.validate('ONCE', 10000, 'cust-1');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('You have already used this coupon');
    });

    it('returns 0 discount for free_shipping type', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ type: 'free_shipping', value: 0 }));

      const result = await service.validate('FREESHIP', 10000);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(0);
    });
  });

  // ── apply ────────────────────────────────────────────────────────

  describe('apply', () => {
    it('applies coupon atomically and records usage', async () => {
      const coupon = fakeCoupon({ type: 'percentage', value: 15 });
      repo.findByCode.mockResolvedValue(coupon);
      repo.validateAndIncrementUsage.mockResolvedValue(coupon);

      const result = await service.apply('SAVE10', 10000, 'cust-1');
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(1500);
      expect(repo.recordCustomerUsage).toHaveBeenCalledWith('coupon-1', 'cust-1');
    });

    it('falls back to validate when atomic increment fails', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ enabled: false }));
      repo.validateAndIncrementUsage.mockResolvedValue(null);

      const result = await service.apply('DISABLED', 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is disabled');
    });

    it('rejects when per-customer limit exceeded (pre-check)', async () => {
      repo.findByCode.mockResolvedValue(fakeCoupon({ maxUsesPerCustomer: 1 }));
      repo.getCustomerUsageCount.mockResolvedValue(1);

      const result = await service.apply('ONCE', 10000, 'cust-1');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('You have already used this coupon');
      expect(repo.validateAndIncrementUsage).not.toHaveBeenCalled();
    });
  });
});
