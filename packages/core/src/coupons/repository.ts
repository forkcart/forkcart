import { eq, desc, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { coupons } from '@forkcart/database/schemas';

export interface CreateCouponData {
  code: string;
  type: string;
  value: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  enabled?: boolean;
}

export interface UpdateCouponData {
  code?: string;
  type?: string;
  value?: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  enabled?: boolean;
}

export class CouponRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.coupons.findFirst({
      where: eq(coupons.id, id),
    });
    return result ?? null;
  }

  async findByCode(code: string) {
    const result = await this.db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase()),
    });
    return result ?? null;
  }

  async findAll() {
    return this.db.query.coupons.findMany({
      orderBy: [desc(coupons.createdAt)],
    });
  }

  async create(data: CreateCouponData) {
    const [coupon] = await this.db
      .insert(coupons)
      .values({
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        maxUses: data.maxUses ?? null,
        maxUsesPerCustomer: data.maxUsesPerCustomer ?? null,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        enabled: data.enabled ?? true,
      })
      .returning();
    if (!coupon) throw new Error('Failed to create coupon');
    return coupon;
  }

  async update(id: string, data: UpdateCouponData) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.code !== undefined) values['code'] = data.code.toUpperCase();
    if (data.type !== undefined) values['type'] = data.type;
    if (data.value !== undefined) values['value'] = data.value;
    if (data.minOrderAmount !== undefined) values['minOrderAmount'] = data.minOrderAmount;
    if (data.maxUses !== undefined) values['maxUses'] = data.maxUses;
    if (data.maxUsesPerCustomer !== undefined)
      values['maxUsesPerCustomer'] = data.maxUsesPerCustomer;
    if (data.startsAt !== undefined) values['startsAt'] = data.startsAt;
    if (data.expiresAt !== undefined) values['expiresAt'] = data.expiresAt;
    if (data.enabled !== undefined) values['enabled'] = data.enabled;

    const [result] = await this.db
      .update(coupons)
      .set(values)
      .where(eq(coupons.id, id))
      .returning();
    return result ?? null;
  }

  async delete(id: string) {
    const [result] = await this.db.delete(coupons).where(eq(coupons.id, id)).returning();
    return result ?? null;
  }

  async incrementUsage(id: string) {
    const [result] = await this.db
      .update(coupons)
      .set({
        usedCount: sql`${coupons.usedCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, id))
      .returning();
    return result ?? null;
  }
}
