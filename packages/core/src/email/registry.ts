import { createLogger } from '../lib/logger';
import type { EmailProvider } from './provider';

const logger = createLogger('email-registry');

/**
 * Registry for email providers — analogous to PaymentProviderRegistry.
 * Only one email provider can be active at a time.
 */
export class EmailProviderRegistry {
  private providers = new Map<string, EmailProvider>();
  private activeProviderId: string | null = null;

  /** Register a provider instance */
  register(provider: EmailProvider): void {
    this.providers.set(provider.id, provider);
    // Auto-set as active if it's the first/only configured provider
    if (provider.isConfigured()) {
      this.activeProviderId = provider.id;
    }
    logger.info({ providerId: provider.id }, 'Email provider registered');
  }

  /** Unregister a provider */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
    if (this.activeProviderId === providerId) {
      this.activeProviderId = null;
    }
    logger.info({ providerId }, 'Email provider unregistered');
  }

  /** Get the active email provider */
  getActiveProvider(): EmailProvider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) ?? null;
  }

  /** Get all registered providers */
  getAll(): EmailProvider[] {
    return [...this.providers.values()];
  }
}
