import type {
  CreateProductInput,
  UpdateProductInput,
  ProductFilter,
  Pagination,
} from '@forkcart/shared';
import { NotFoundError, ConflictError, ValidationError } from '@forkcart/shared';
import type { ProductRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import type { PluginLoader } from '../plugins/plugin-loader';
import { PRODUCT_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('product-service');

/** Dependencies injected into the product service */
export interface ProductServiceDeps {
  productRepository: ProductRepository;
  eventBus: EventBus;
  /** Optional plugin loader for filter support */
  pluginLoader?: PluginLoader | null;
}

/**
 * Product service — pure business logic.
 * No HTTP concerns, no direct database access. Depends on repository interfaces.
 */
export class ProductService {
  private readonly repo: ProductRepository;
  private readonly events: EventBus;
  private pluginLoader: PluginLoader | null;

  constructor(deps: ProductServiceDeps) {
    this.repo = deps.productRepository;
    this.events = deps.eventBus;
    this.pluginLoader = deps.pluginLoader ?? null;
  }

  /** Set plugin loader (for late injection after PluginLoader is initialized) */
  setPluginLoader(loader: PluginLoader): void {
    this.pluginLoader = loader;
  }

  /** Apply product filters (price, title, description) if pluginLoader is available */
  private async applyProductFilters<T extends Record<string, unknown>>(product: T): Promise<T> {
    if (!this.pluginLoader) return product;

    const ctx = { productId: product['id'] };
    const filtered = { ...product } as Record<string, unknown>;

    // Apply price filter
    if ('price' in filtered && typeof filtered['price'] === 'number') {
      filtered['price'] = await this.pluginLoader.applyFilters(
        'product:price',
        filtered['price'],
        ctx,
      );
    }

    // Apply title filter
    if ('name' in filtered && typeof filtered['name'] === 'string') {
      filtered['name'] = await this.pluginLoader.applyFilters(
        'product:title',
        filtered['name'],
        ctx,
      );
    }

    // Apply description filter
    if ('description' in filtered && typeof filtered['description'] === 'string') {
      filtered['description'] = await this.pluginLoader.applyFilters(
        'product:description',
        filtered['description'],
        ctx,
      );
    }

    return filtered as T;
  }

  async getById(id: string) {
    const product = await this.repo.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    return this.applyProductFilters(product);
  }

  async getBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug);
    if (!product) {
      throw new NotFoundError('Product', slug);
    }
    return this.applyProductFilters(product);
  }

  async list(filter: ProductFilter, pagination: Pagination) {
    const result = await this.repo.findMany(filter, pagination);
    // Apply filters to each product in the list
    if (this.pluginLoader && result.data.length > 0) {
      result.data = await Promise.all(result.data.map((p) => this.applyProductFilters(p)));
    }
    return result;
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
