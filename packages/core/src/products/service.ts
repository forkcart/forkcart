import type { CreateProductInput, UpdateProductInput, ProductFilter, Pagination } from '@forkcart/shared';
import { NotFoundError, ConflictError, ValidationError } from '@forkcart/shared';
import type { ProductRepository } from './repository.js';
import type { EventBus } from '../plugins/event-bus.js';
import { PRODUCT_EVENTS } from './events.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('product-service');

/** Dependencies injected into the product service */
export interface ProductServiceDeps {
  productRepository: ProductRepository;
  eventBus: EventBus;
}

/**
 * Product service — pure business logic.
 * No HTTP concerns, no direct database access. Depends on repository interfaces.
 */
export class ProductService {
  private readonly repo: ProductRepository;
  private readonly events: EventBus;

  constructor(deps: ProductServiceDeps) {
    this.repo = deps.productRepository;
    this.events = deps.eventBus;
  }

  async getById(id: string) {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    return product;
  }

  async getBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) {
      throw new NotFoundError('Product', slug);
    }
    return product;
  }

  async list(filter: ProductFilter, pagination: Pagination) {
    return this.repo.findMany(filter, pagination);
  }

  async create(input: CreateProductInput) {
    const slugExists = await this.repo.existsBySlug(input.slug);
    if (slugExists) {
      throw new ConflictError(`Product with slug "${input.slug}" already exists`);
    }

    if (input.compareAtPrice !== undefined && input.compareAtPrice <= input.price) {
      throw new ValidationError('Compare-at price must be higher than the regular price');
    }

    const product = await this.repo.create(input);
    logger.info({ productId: product.id, slug: product.slug }, 'Product created');

    await this.events.emit(PRODUCT_EVENTS.CREATED, { product });

    return product;
  }

  async update(id: string, input: UpdateProductInput) {
    if (input.slug) {
      const slugExists = await this.repo.existsBySlug(input.slug, id);
      if (slugExists) {
        throw new ConflictError(`Product with slug "${input.slug}" already exists`);
      }
    }

    if (
      input.compareAtPrice !== undefined &&
      input.price !== undefined &&
      input.compareAtPrice <= input.price
    ) {
      throw new ValidationError('Compare-at price must be higher than the regular price');
    }

    const product = await this.repo.update(id, input);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    logger.info({ productId: product.id }, 'Product updated');
    await this.events.emit(PRODUCT_EVENTS.UPDATED, { product });

    return product;
  }

  async delete(id: string) {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    await this.repo.delete(id);
    logger.info({ productId: id }, 'Product deleted');

    await this.events.emit(PRODUCT_EVENTS.DELETED, { product });

    return true;
  }
}
