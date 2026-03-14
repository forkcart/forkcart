import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { ProductReviewRepository, CreateReviewData } from './repository';
import { createLogger } from '../lib/logger';

const logger = createLogger('product-review-service');

export interface ProductReviewServiceDeps {
  productReviewRepository: ProductReviewRepository;
}

export class ProductReviewService {
  private readonly repo: ProductReviewRepository;

  constructor(deps: ProductReviewServiceDeps) {
    this.repo = deps.productReviewRepository;
  }

  async listByProduct(productId: string, options?: { status?: string }) {
    return this.repo.findByProductId(productId, options);
  }

  async listAll(options?: { status?: string }) {
    return this.repo.findAll(options);
  }

  async create(data: CreateReviewData) {
    if (data.rating < 1 || data.rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }
    const review = await this.repo.create(data);
    logger.info({ reviewId: review.id, productId: data.productId }, 'Review created');
    return review;
  }

  async approve(id: string) {
    const review = await this.repo.findById(id);
    if (!review) throw new NotFoundError('Review', id);
    const updated = await this.repo.updateStatus(id, 'approved');
    logger.info({ reviewId: id }, 'Review approved');
    return updated;
  }

  async reject(id: string) {
    const review = await this.repo.findById(id);
    if (!review) throw new NotFoundError('Review', id);
    const updated = await this.repo.updateStatus(id, 'rejected');
    logger.info({ reviewId: id }, 'Review rejected');
    return updated;
  }

  async delete(id: string) {
    const review = await this.repo.findById(id);
    if (!review) throw new NotFoundError('Review', id);
    await this.repo.delete(id);
    logger.info({ reviewId: id }, 'Review deleted');
  }

  async getAverageRating(productId: string) {
    return this.repo.getAverageRating(productId);
  }

  async getAverageRatingsForProducts(productIds: string[]) {
    return this.repo.getAverageRatingsForProducts(productIds);
  }
}
