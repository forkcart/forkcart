import { NotFoundError } from '@forkcart/shared';
import type { VariantRepository, CreateVariantData, UpdateVariantData } from './repository';
import { createLogger } from '../lib/logger';

const logger = createLogger('variant-service');

export interface VariantServiceDeps {
  variantRepository: VariantRepository;
}

export class VariantService {
  private readonly repo: VariantRepository;

  constructor(deps: VariantServiceDeps) {
    this.repo = deps.variantRepository;
  }

  async listByProduct(productId: string) {
    return this.repo.findByProductId(productId);
  }

  async getById(id: string) {
    const variant = await this.repo.findById(id);
    if (!variant) throw new NotFoundError('Variant', id);
    return variant;
  }

  async create(data: CreateVariantData) {
    const variant = await this.repo.create(data);
    logger.info({ variantId: variant.id, productId: data.productId }, 'Variant created');
    return variant;
  }

  async createMany(items: CreateVariantData[]) {
    const variants = await this.repo.createMany(items);
    logger.info({ count: variants.length }, 'Variants batch created');
    return variants;
  }

  async update(id: string, data: UpdateVariantData) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Variant', id);
    const variant = await this.repo.update(id, data);
    logger.info({ variantId: id }, 'Variant updated');
    return variant;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Variant', id);
    await this.repo.delete(id);
    logger.info({ variantId: id }, 'Variant deleted');
  }

  async deleteByProductId(productId: string) {
    await this.repo.deleteByProductId(productId);
    logger.info({ productId }, 'All variants deleted for product');
  }

  /** Generate variant combinations from attribute selections */
  async generateVariants(
    productId: string,
    attributeSelections: Array<{ name: string; values: string[] }>,
  ) {
    // Build all combinations
    const combinations = this.cartesian(attributeSelections);

    const items: CreateVariantData[] = combinations.map((combo, idx) => ({
      productId,
      name: combo.map((c) => c.value).join(' / '),
      attributes: Object.fromEntries(combo.map((c) => [c.name, c.value])),
      sortOrder: idx,
    }));

    return this.repo.createMany(items);
  }

  private cartesian(
    selections: Array<{ name: string; values: string[] }>,
  ): Array<Array<{ name: string; value: string }>> {
    if (selections.length === 0) return [[]];

    const [first, ...rest] = selections;
    if (!first) return [[]];

    const restCombos = this.cartesian(rest);
    const result: Array<Array<{ name: string; value: string }>> = [];

    for (const value of first.values) {
      for (const combo of restCombos) {
        result.push([{ name: first.name, value }, ...combo]);
      }
    }

    return result;
  }
}
