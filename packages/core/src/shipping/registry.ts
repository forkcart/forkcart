import { createLogger } from '../lib/logger';

const logger = createLogger('shipping-registry');

/** Shipping rate quote */
export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimatedDays?: number;
  carrier?: string;
}

/** Address for rate calculation */
export interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  state?: string;
  country: string;
}

/** Parcel dimensions/weight */
export interface ShippingParcel {
  weight: number;
  weightUnit: 'kg' | 'lb';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'cm' | 'in';
}

/** Tracking info returned after creating a shipment */
export interface ShippingLabel {
  trackingNumber: string;
  carrier: string;
  labelUrl?: string;
  trackingUrl?: string;
}

/** Tracking status update */
export interface ShippingTrackingStatus {
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  location?: string;
  timestamp: Date;
  description?: string;
}

/**
 * Shipping provider interface for carrier integrations (DHL, FedEx, UPS, etc.)
 */
export interface ShippingProvider {
  readonly id: string;
  readonly displayName: string;

  /** Initialize with settings from DB */
  initialize(settings: Record<string, unknown>): Promise<void>;

  /** Check if the provider is properly configured */
  isConfigured(): boolean;

  /** Calculate shipping rates */
  getRates(
    from: ShippingAddress,
    to: ShippingAddress,
    parcels: ShippingParcel[],
  ): Promise<ShippingRate[]>;

  /** Create a shipment and get label */
  createShipment(
    from: ShippingAddress,
    to: ShippingAddress,
    parcels: ShippingParcel[],
    rateId: string,
  ): Promise<ShippingLabel>;

  /** Get tracking status */
  getTracking(trackingNumber: string): Promise<ShippingTrackingStatus[]>;
}

/**
 * Central registry for shipping carrier providers.
 * Plugins register themselves here. The ShippingService uses this for carrier integrations.
 */
export class ShippingProviderRegistry {
  private providers = new Map<string, ShippingProvider>();

  /** Register a shipping provider */
  register(provider: ShippingProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn({ providerId: provider.id }, 'Shipping provider already registered, overwriting');
    }
    this.providers.set(provider.id, provider);
    logger.info(
      { providerId: provider.id, displayName: provider.displayName },
      'Shipping provider registered',
    );
  }

  /** Unregister a provider */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
    logger.info({ providerId }, 'Shipping provider unregistered');
  }

  /** Get a specific provider */
  get(providerId: string): ShippingProvider | undefined {
    return this.providers.get(providerId);
  }

  /** Get all registered provider IDs */
  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }

  /** Get all configured providers */
  getActiveProviders(): ShippingProvider[] {
    const active: ShippingProvider[] = [];
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) {
        active.push(provider);
      }
    }
    return active;
  }

  /** Check if any shipping provider is active */
  hasActiveProvider(): boolean {
    for (const provider of this.providers.values()) {
      if (provider.isConfigured()) return true;
    }
    return false;
  }

  /**
   * Get rates from all active providers.
   * Aggregates rates from all configured carrier integrations.
   */
  async getAllRates(
    from: ShippingAddress,
    to: ShippingAddress,
    parcels: ShippingParcel[],
  ): Promise<Array<ShippingRate & { providerId: string }>> {
    const allRates: Array<ShippingRate & { providerId: string }> = [];

    for (const provider of this.getActiveProviders()) {
      try {
        const rates = await provider.getRates(from, to, parcels);
        for (const rate of rates) {
          allRates.push({ ...rate, providerId: provider.id });
        }
      } catch (error) {
        logger.error(
          { providerId: provider.id, error },
          'Failed to get rates from shipping provider',
        );
      }
    }

    return allRates;
  }
}
