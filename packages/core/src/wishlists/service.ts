import type { WishlistRepository } from './repository';
import { createLogger } from '../lib/logger';

const logger = createLogger('wishlist-service');

export interface WishlistServiceDeps {
  wishlistRepository: WishlistRepository;
}

export class WishlistService {
  private readonly repo: WishlistRepository;

  constructor(deps: WishlistServiceDeps) {
    this.repo = deps.wishlistRepository;
  }

  async list(customerId: string) {
    return this.repo.findByCustomerId(customerId);
  }

  async toggle(customerId: string, productId: string): Promise<{ added: boolean }> {
    const existing = await this.repo.findByCustomerAndProduct(customerId, productId);
    if (existing) {
      await this.repo.remove(customerId, productId);
      logger.info({ customerId, productId }, 'Product removed from wishlist');
      return { added: false };
    }
    await this.repo.add(customerId, productId);
    logger.info({ customerId, productId }, 'Product added to wishlist');
    return { added: true };
  }

  async isInWishlist(customerId: string, productId: string): Promise<boolean> {
    const item = await this.repo.findByCustomerAndProduct(customerId, productId);
    return !!item;
  }
}
