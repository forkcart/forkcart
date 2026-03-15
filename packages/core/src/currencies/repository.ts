import { eq, and } from 'drizzle-orm';
import { currencies, productPrices } from '@forkcart/database';
import type { Database } from '@forkcart/database';

export class CurrencyRepository {
  constructor(private db: Database) {}

  async findAll() {
    return this.db.select().from(currencies).orderBy(currencies.code);
  }

  async findActive() {
    return this.db
      .select()
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(currencies.code);
  }

  async findByCode(code: string) {
    const rows = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code.toUpperCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  async findDefault() {
    const rows = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.isDefault, true))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: {
    code: string;
    name: string;
    symbol: string;
    decimalPlaces?: number;
    isDefault?: boolean;
    isActive?: boolean;
    exchangeRate?: number;
  }) {
    const rows = await this.db
      .insert(currencies)
      .values({
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: data.decimalPlaces ?? 2,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        exchangeRate: data.exchangeRate ?? 100000,
      })
      .returning();
    return rows[0]!;
  }

  async update(
    code: string,
    data: Partial<{
      name: string;
      symbol: string;
      decimalPlaces: number;
      isDefault: boolean;
      isActive: boolean;
      exchangeRate: number;
    }>,
  ) {
    const rows = await this.db
      .update(currencies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(currencies.code, code.toUpperCase()))
      .returning();
    return rows[0] ?? null;
  }

  async delete(code: string) {
    const rows = await this.db
      .delete(currencies)
      .where(eq(currencies.code, code.toUpperCase()))
      .returning();
    return rows.length > 0;
  }

  /** Clear isDefault on all currencies (used before setting a new default) */
  async clearDefault() {
    await this.db
      .update(currencies)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(currencies.isDefault, true));
  }

  // ─── Product Prices ──────────────────────────────────────────────────────────

  async getProductPrices(productId: string) {
    return this.db
      .select()
      .from(productPrices)
      .where(eq(productPrices.productId, productId))
      .orderBy(productPrices.currencyCode);
  }

  async getProductPrice(productId: string, currencyCode: string) {
    const rows = await this.db
      .select()
      .from(productPrices)
      .where(
        and(
          eq(productPrices.productId, productId),
          eq(productPrices.currencyCode, currencyCode.toUpperCase()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertProductPrice(
    productId: string,
    currencyCode: string,
    price: number,
    compareAtPrice?: number | null,
  ) {
    const existing = await this.getProductPrice(productId, currencyCode);
    if (existing) {
      const rows = await this.db
        .update(productPrices)
        .set({
          price,
          compareAtPrice: compareAtPrice ?? null,
          updatedAt: new Date(),
        })
        .where(eq(productPrices.id, existing.id))
        .returning();
      return rows[0]!;
    }
    const rows = await this.db
      .insert(productPrices)
      .values({
        productId,
        currencyCode: currencyCode.toUpperCase(),
        price,
        compareAtPrice: compareAtPrice ?? null,
      })
      .returning();
    return rows[0]!;
  }

  async deleteProductPrice(productId: string, currencyCode: string) {
    const rows = await this.db
      .delete(productPrices)
      .where(
        and(
          eq(productPrices.productId, productId),
          eq(productPrices.currencyCode, currencyCode.toUpperCase()),
        ),
      )
      .returning();
    return rows.length > 0;
  }
}
