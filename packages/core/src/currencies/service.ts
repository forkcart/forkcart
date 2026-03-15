import type { CurrencyRepository } from './repository';

export class CurrencyService {
  constructor(private deps: { currencyRepository: CurrencyRepository }) {}

  async listAll() {
    return this.deps.currencyRepository.findAll();
  }

  async listActive() {
    return this.deps.currencyRepository.findActive();
  }

  async getByCode(code: string) {
    const currency = await this.deps.currencyRepository.findByCode(code);
    if (!currency) throw new Error(`Currency ${code} not found`);
    return currency;
  }

  async getDefault() {
    return this.deps.currencyRepository.findDefault();
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
    if (data.isDefault) {
      await this.deps.currencyRepository.clearDefault();
    }
    return this.deps.currencyRepository.create(data);
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
    if (data.isDefault) {
      await this.deps.currencyRepository.clearDefault();
    }
    const result = await this.deps.currencyRepository.update(code, data);
    if (!result) throw new Error(`Currency ${code} not found`);
    return result;
  }

  async updateExchangeRate(code: string, rate: number) {
    return this.update(code, { exchangeRate: rate });
  }

  async delete(code: string) {
    const currency = await this.deps.currencyRepository.findByCode(code);
    if (!currency) throw new Error(`Currency ${code} not found`);
    if (currency.isDefault) throw new Error('Cannot delete the default currency');
    return this.deps.currencyRepository.delete(code);
  }

  // ─── Product Prices ──────────────────────────────────────────────────────────

  async getProductPrices(productId: string) {
    return this.deps.currencyRepository.getProductPrices(productId);
  }

  async upsertProductPrice(
    productId: string,
    currencyCode: string,
    price: number,
    compareAtPrice?: number | null,
  ) {
    return this.deps.currencyRepository.upsertProductPrice(
      productId,
      currencyCode,
      price,
      compareAtPrice,
    );
  }

  async deleteProductPrice(productId: string, currencyCode: string) {
    return this.deps.currencyRepository.deleteProductPrice(productId, currencyCode);
  }

  /**
   * Get the price of a product in a specific currency.
   * If a specific price override exists, use that.
   * Otherwise, convert the base price using exchange rates.
   */
  async getProductPriceInCurrency(
    productId: string,
    basePriceCents: number,
    baseCompareAtPrice: number | null,
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<{ price: number; compareAtPrice: number | null; isConverted: boolean }> {
    if (baseCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
      return { price: basePriceCents, compareAtPrice: baseCompareAtPrice, isConverted: false };
    }

    // Check for a manual price override
    const override = await this.deps.currencyRepository.getProductPrice(productId, targetCurrency);
    if (override) {
      return {
        price: override.price,
        compareAtPrice: override.compareAtPrice,
        isConverted: false,
      };
    }

    // Convert using exchange rates
    const sourceCurrency = await this.deps.currencyRepository.findByCode(baseCurrency);
    const destCurrency = await this.deps.currencyRepository.findByCode(targetCurrency);

    if (!sourceCurrency || !destCurrency) {
      return { price: basePriceCents, compareAtPrice: baseCompareAtPrice, isConverted: false };
    }

    // Convert: amount_in_default = amount_source / source_rate
    // amount_in_target = amount_in_default * target_rate
    const convertedPrice = Math.round(
      (basePriceCents * destCurrency.exchangeRate) / sourceCurrency.exchangeRate,
    );
    const convertedCompare = baseCompareAtPrice
      ? Math.round((baseCompareAtPrice * destCurrency.exchangeRate) / sourceCurrency.exchangeRate)
      : null;

    return { price: convertedPrice, compareAtPrice: convertedCompare, isConverted: true };
  }

  /** Convert an amount from one currency to another */
  async convertAmount(amount: number, fromCode: string, toCode: string): Promise<number> {
    if (fromCode.toUpperCase() === toCode.toUpperCase()) return amount;

    const from = await this.deps.currencyRepository.findByCode(fromCode);
    const to = await this.deps.currencyRepository.findByCode(toCode);

    if (!from || !to) return amount;

    return Math.round((amount * to.exchangeRate) / from.exchangeRate);
  }
}
