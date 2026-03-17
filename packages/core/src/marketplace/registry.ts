import type { MarketplaceProvider } from './types';
import { createLogger } from '../lib/logger';

const logger = createLogger('marketplace-registry');

/**
 * Central registry for all marketplace providers.
 * Plugins register themselves here. The MarketplaceService uses this to route operations.
 */
export class MarketplaceProviderRegistry {
  private providers = new Map<string, MarketplaceProvider>();

  /** Register a marketplace provider */
  register(provider: MarketplaceProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn(
        { providerId: provider.id },
        'Marketplace provider already registered, overwriting',
      );
    }
    this.providers.set(provider.id, provider);
    logger.info(
      { providerId: provider.id, name: provider.name },
      'Marketplace provider registered',
    );
  }

  /** Unregister a provider */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
    logger.info({ providerId }, 'Marketplace provider unregistered');
  }

  /** Get a specific provider */
  get(providerId: string): MarketplaceProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Get all registered provider IDs */
  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }

  /** Get all registered providers */
  getAll(): MarketplaceProvider[] {
    return [...this.providers.values()];
  }
}
