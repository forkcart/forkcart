import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { CouponRepository, CreateCouponData, UpdateCouponData } from './repository';
import { createLogger } from '../lib/logger';

const logger = createLogger('coupon-service');

export interface CouponServiceDeps {
  couponRepository: CouponRepository;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  message: string;
  type?: string;
}

export class CouponService {
  private readonly repo: CouponRepository;

  constructor(deps: CouponServiceDeps) {
    this.repo = deps.couponRepository;
  }

  async list() {
    return this.repo.findAll();
  }

  async getById(id: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) throw new NotFoundError('Coupon', id);
    return coupon;
  }

  async create(data: CreateCouponData) {
    const existing = await this.repo.findByCode(data.code);
    if (existing) {
      throw new ValidationError(`Coupon code "${data.code.toUpperCase()}" already exists`);
    }
    const coupon = await this.repo.create(data);
    logger.info({ couponId: coupon.id, code: coupon.code }, 'Coupon created');
    return coupon;
  }

  async update(id: string, data: UpdateCouponData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Coupon', id);

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const duplicate = await this.repo.findByCode(data.code);
      if (duplicate) {
        throw new ValidationError(`Coupon code "${data.code.toUpperCase()}" already exists`);
      }
    }

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Coupon', id);
    logger.info({ couponId: id }, 'Coupon updated');
    return updated;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Coupon', id);
    await this.repo.delete(id);
    logger.info({ couponId: id, code: existing.code }, 'Coupon deleted');
  }

  async validate(
    code: string,
    cartTotal: number,
    _customerId?: string,
  ): Promise<CouponValidationResult> {
    const coupon = await this.repo.findByCode(code);

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Coupon not found' };
    }

    if (!coupon.enabled) {
      return { valid: false, discount: 0, message: 'Coupon is disabled' };
    }

    const now = new Date();

    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, discount: 0, message: 'Coupon is not yet active' };
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (coupon.minOrderAmount !== null && cartTotal < coupon.minOrderAmount) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum order amount is ${(coupon.minOrderAmount / 100).toFixed(2)} €`,
      };
    }

    const discount = this.calculateDiscount(coupon.type, coupon.value, cartTotal);

    return {
      valid: true,
      discount,
      message: 'Coupon applied successfully',
      type: coupon.type,
    };
  }

  async apply(
    code: string,
    cartTotal: number,
    customerId?: string,
  ): Promise<CouponValidationResult> {
    const result = await this.validate(code, cartTotal, customerId);
    if (!result.valid) return result;

    const coupon = await this.repo.findByCode(code);
    if (coupon) {
      await this.repo.incrementUsage(coupon.id);
      logger.info(
        { couponId: coupon.id, code: coupon.code, discount: result.discount },
        'Coupon applied',
      );
    }

    return result;
  }

  private calculateDiscount(type: string, value: number, cartTotal: number): number {
    switch (type) {
      case 'percentage': {
        const discount = Math.round((cartTotal * value) / 100);
        return Math.min(discount, cartTotal);
      }
      case 'fixed_amount':
        return Math.min(value, cartTotal);
      case 'free_shipping':
        return 0; // Shipping discount handled separately
      default:
        return 0;
    }
  }
}
