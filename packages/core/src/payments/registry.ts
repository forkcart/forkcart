import type { PaymentProvider, PaymentProviderClientConfig } from './provider';
import { createLogger } from '../lib/logger';

const logger = createLogger('payment-registry');

/**
 * Central registry for all payment providers.
 * Plugins register themselves here. The PaymentService uses this to route payments.
 */
export class PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();

  /** Register a payment provider */
  register(provider: PaymentProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn({ providerId: provider.id }, 'Provider already registered, overwriting');
    }
    this.providers.set(provider.id, provider);
    logger.info({ providerId: provider.id, displayName: provider.displayName }, 'Payment provider registered');
  }

  /** Unregister a provider */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
    logger.info({ providerId }, 'Payment provider unregistered');
  }

  /** Get a specific provider */
  get(providerId: string): PaymentProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Get all registered provider IDs */
  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }

  /** Get all active (configured) providers with their client configs */
  getActiveProviders(): PaymentProviderClientConfig[] {
    const active: PaymentProviderClientConfig[] = [];
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) {
        active.push(provider.getClientConfig());
      }
    }
    return active;
  }

  /** Check if any payment provider is active */
  hasActiveProvider(): boolean {
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) return true;
    }
    return false;
  }

  /** Find a provider that can handle a webhook based on headers */
  findProviderForWebhook(headers: Record<string, string>): PaymentProvider | undefined {
    // Stripe sends stripe-signature header
    if (headers['stripe-signature']) {
      return this.providers.get('stripe');
    }
    // PayPal would send paypal-* headers, etc.
    // Fallback: try all providers
    return undefined;
  }
}
