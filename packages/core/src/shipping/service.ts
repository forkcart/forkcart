import { NotFoundError } from '@forkcart/shared';
import type {
  ShippingRepository,
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
} from './repository';
import type { EventBus } from '../plugins/event-bus';
import type { PluginLoader } from '../plugins/plugin-loader';
import { SHIPPING_EVENTS } from './events';
import { createLogger } from '../lib/logger';

const logger = createLogger('shipping-service');

/** EU country codes */
const EU_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
];

export interface ShippingServiceDeps {
  shippingRepository: ShippingRepository;
  eventBus: EventBus;
  /** Optional plugin loader for filter support */
  pluginLoader?: PluginLoader | null;
}

/**
 * Shipping service — business logic for shipping methods.
 */
export class ShippingService {
  private readonly repo: ShippingRepository;
  private readonly events: EventBus;
  private pluginLoader: PluginLoader | null;

  constructor(deps: ShippingServiceDeps) {
    this.repo = deps.shippingRepository;
    this.events = deps.eventBus;
    this.pluginLoader = deps.pluginLoader ?? null;
  }

  /** Set plugin loader (for late injection after PluginLoader is initialized) */
  setPluginLoader(loader: PluginLoader): void {
    this.pluginLoader = loader;
  }

  async getById(id: string) {
    const method = await this.repo.findById(id);
    if (!method) {
      throw new NotFoundError('ShippingMethod', id);
    }
    return method;
  }

  async listAll() {
    return this.repo.findAll();
  }

  async listActive() {
    return this.repo.findActive();
  }

  /**
   * Get available shipping methods for a given country and cart total (in cents).
   * Filters by: active, country match, and minOrderValue.
   */
  async getAvailableShippingMethods(country: string, cartTotal: number) {
    const active = await this.repo.findActive();

    let methods = active.filter((method) => {
      // Check country
      const countries = method.countries as string[];
      if (countries.length > 0) {
        const matchesCountry =
          countries.includes(country) ||
          (countries.includes('EU') && EU_COUNTRIES.includes(country)) ||
          countries.includes('WORLDWIDE');
        if (!matchesCountry) return false;
      }

      // Check min order value
      if (method.minOrderValue && cartTotal < method.minOrderValue) {
        return false;
      }

      return true;
    });

    // Apply checkout:shipping-methods filter — allows plugins to modify available shipping methods
    if (this.pluginLoader) {
      methods = await this.pluginLoader.applyFilters('checkout:shipping-methods', methods, {
        country,
        cartTotal,
      });
    }

    return methods;
  }

  /**
   * Calculate shipping cost for a method given the cart total.
   * Returns 0 if freeAbove threshold is met.
   */
  async calculateShippingCost(methodId: string, cartTotal: number): Promise<number> {
    const method = await this.getById(methodId);

    // Free shipping if cart total meets freeAbove threshold
    let cost: number;
    if (method.freeAbove && cartTotal >= method.freeAbove) {
      cost = 0;
    } else {
      cost = method.price;
    }

    // Apply cart:shipping filter — allows plugins to modify shipping cost
    if (this.pluginLoader) {
      cost = await this.pluginLoader.applyFilters('cart:shipping', cost, {
        methodId,
        method,
        cartTotal,
      });
    }

    return cost;
  }

  async create(input: CreateShippingMethodInput) {
    const method = await this.repo.create(input);
    logger.info({ methodId: method.id, name: method.name }, 'Shipping method created');
    await this.events.emit(SHIPPING_EVENTS.METHOD_CREATED, { method });
    return method;
  }

  async update(id: string, input: UpdateShippingMethodInput) {
    // Verify exists
    await this.getById(id);

    const method = await this.repo.update(id, input);
    if (!method) {
      throw new NotFoundError('ShippingMethod', id);
    }

    logger.info({ methodId: method.id, name: method.name }, 'Shipping method updated');
    await this.events.emit(SHIPPING_EVENTS.METHOD_UPDATED, { method });
    return method;
  }

  async delete(id: string) {
    await this.getById(id);
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError('ShippingMethod', id);
    }
    logger.info({ methodId: id }, 'Shipping method deleted');
    return true;
  }
}
