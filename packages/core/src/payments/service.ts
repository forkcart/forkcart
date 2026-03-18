import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { PaymentRepository } from './repository';
import type { PaymentProviderRegistry } from './registry';
import type { PaymentProvider, PaymentProviderClientConfig } from './provider';
import type { CartRepository } from '../carts/repository';
import type { OrderRepository } from '../orders/repository';
import type { CustomerRepository } from '../customers/repository';
import type { EventBus } from '../plugins/event-bus';
import type { PluginLoader } from '../plugins/plugin-loader';
import { PAYMENT_EVENTS } from './events';
import { ORDER_EVENTS } from '../orders/events';
import type { ShippingService } from '../shipping/service';
import { createLogger } from '../lib/logger';

const logger = createLogger('payment-service');

export interface PaymentServiceDeps {
  paymentRepository: PaymentRepository;
  paymentProviderRegistry: PaymentProviderRegistry;
  cartRepository: CartRepository;
  orderRepository: OrderRepository;
  customerRepository: CustomerRepository;
  eventBus: EventBus;
  /** Optional plugin loader for filter support */
  pluginLoader?: PluginLoader | null;
  /** Optional shipping service for shipping cost calculation */
  shippingService?: ShippingService | null;
}

export interface CreatePaymentIntentInput {
  cartId: string;
  providerId: string;
  shippingMethodId?: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/** Generate order number: FC-YYYYMMDD-XXXX */
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FC-${date}-${random}`;
}

export class PaymentService {
  private readonly paymentRepo: PaymentRepository;
  private readonly registry: PaymentProviderRegistry;
  private readonly cartRepo: CartRepository;
  private readonly orderRepo: OrderRepository;
  private readonly customerRepo: CustomerRepository;
  private readonly events: EventBus;
  private pluginLoader: PluginLoader | null;
  private shippingService: ShippingService | null;

  constructor(deps: PaymentServiceDeps) {
    this.paymentRepo = deps.paymentRepository;
    this.registry = deps.paymentProviderRegistry;
    this.cartRepo = deps.cartRepository;
    this.orderRepo = deps.orderRepository;
    this.customerRepo = deps.customerRepository;
    this.events = deps.eventBus;
    this.pluginLoader = deps.pluginLoader ?? null;
    this.shippingService = deps.shippingService ?? null;
  }

  /** Set plugin loader (for late injection after PluginLoader is initialized) */
  setPluginLoader(loader: PluginLoader): void {
    this.pluginLoader = loader;
  }

  /** Get all active payment providers for the checkout frontend */
  async getActiveProviders(): Promise<PaymentProviderClientConfig[]> {
    let providers = this.registry.getActiveProviders();

    // Apply checkout:payment-methods filter — allows plugins to modify available payment methods
    if (this.pluginLoader) {
      providers = await this.pluginLoader.applyFilters('checkout:payment-methods', providers, {});
    }

    return providers;
  }

  /** Check if any payment provider is available */
  hasActiveProvider(): boolean {
    return this.registry.hasActiveProvider();
  }

  private getProvider(providerId: string): PaymentProvider {
    const provider = this.registry.get(providerId);
    if (!provider) {
      throw new ValidationError(`Payment provider "${providerId}" is not registered`);
    }
    if (!provider.isConfigured()) {
      throw new ValidationError(`Payment provider "${providerId}" is not configured`);
    }
    return provider;
  }

  /** Create a payment intent via the specified provider */
  async createPaymentIntent(input: CreatePaymentIntentInput) {
    const provider = this.getProvider(input.providerId);

    // 1. Load cart with products — prices from server
    const cart = await this.cartRepo.findById(input.cartId);
    if (!cart) throw new NotFoundError('Cart', input.cartId);
    if (cart.items.length === 0) throw new ValidationError('Cart is empty');

    // 2. Calculate amount from DB prices (NEVER trust client)
    let amount = 0;
    for (const item of cart.items) {
      const unitPrice = item.variant?.price ?? item.product.price;
      amount += unitPrice * item.quantity;
    }
    if (amount <= 0) throw new ValidationError('Cart total must be greater than 0');

    // 3. Find existing customer or proceed as guest
    const existingCustomer = await this.customerRepo.findByEmail(input.customer.email);
    const customerId = existingCustomer?.id ?? null;

    // 4. Create payment intent via provider
    const result = await provider.createPaymentIntent({
      amount,
      currency: 'eur',
      customer: {
        id: customerId ?? `guest_${input.customer.email}`,
        email: input.customer.email,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
      },
      shippingAddress: input.shippingAddress,
      metadata: {
        cartId: input.cartId,
        ...(customerId ? { customerId } : {}),
        guestEmail: input.customer.email,
        guestFirstName: input.customer.firstName,
        guestLastName: input.customer.lastName,
        shippingAddress: JSON.stringify(input.shippingAddress),
        ...(input.shippingMethodId ? { shippingMethodId: input.shippingMethodId } : {}),
      },
    });

    logger.info(
      { providerId: provider.id, externalId: result.externalId, amount },
      'PaymentIntent created',
    );

    await this.events.emit(PAYMENT_EVENTS.CREATED, {
      provider: provider.id,
      externalId: result.externalId,
      amount,
    });

    return {
      clientSecret: result.clientSecret,
      externalId: result.externalId,
      amount: result.amount,
      currency: result.currency,
      provider: provider.id,
      clientData: result.clientData,
    };
  }

  /** Handle a webhook from any payment provider */
  async handleWebhook(providerId: string, rawBody: string, headers: Record<string, string>) {
    const provider = this.registry.get(providerId);
    if (!provider) {
      throw new ValidationError(`Unknown payment provider: ${providerId}`);
    }

    const event = await provider.verifyWebhook(rawBody, headers);

    switch (event.type) {
      case 'payment.succeeded': {
        await this.handlePaymentSucceeded(
          provider.id,
          event.externalId,
          event.amount,
          event.metadata,
        );
        break;
      }
      case 'payment.failed': {
        await this.handlePaymentFailed(provider.id, event.externalId, event.errorMessage);
        break;
      }
      case 'payment.refunded': {
        logger.info(
          { providerId: provider.id, externalId: event.externalId },
          'Refund webhook received',
        );
        break;
      }
    }
  }

  private async handlePaymentSucceeded(
    providerId: string,
    externalId: string,
    amount: number,
    metadata: Record<string, string>,
  ) {
    const cartId = metadata['cartId'] ?? '';
    const customerId = metadata['customerId'] ?? '';
    const guestEmail = metadata['guestEmail'] ?? '';
    const guestFirstName = metadata['guestFirstName'] ?? '';
    const guestLastName = metadata['guestLastName'] ?? '';
    const shippingAddressRaw = metadata['shippingAddress'] ?? '{}';
    const shippingMethodId = metadata['shippingMethodId'] ?? '';

    if (!cartId) {
      logger.error({ cartId, externalId }, 'Missing cartId in webhook metadata');
      return;
    }

    // Guest checkout: customerId is optional
    if (!customerId && !guestEmail) {
      logger.error({ cartId, externalId }, 'Missing both customerId and guestEmail in metadata');
      return;
    }

    logger.info({ providerId, externalId, isGuest: !customerId }, 'Payment succeeded');

    const cart = await this.cartRepo.findById(cartId);
    if (!cart) {
      logger.error({ cartId }, 'Cart not found for succeeded payment');
      return;
    }

    const shippingAddress = JSON.parse(shippingAddressRaw) as {
      firstName: string;
      lastName: string;
      addressLine1: string;
      city: string;
      postalCode: string;
      country: string;
    };

    // Only create address record if we have a customer
    let shippingAddressId: string | undefined;
    if (customerId) {
      const addressResult = await this.customerRepo.createAddress({
        customerId,
        ...shippingAddress,
      });
      shippingAddressId = addressResult.id;
    }

    // Build order
    const orderItems = cart.items.map((item) => {
      const unitPrice = item.variant?.price ?? item.product.price;
      return {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      };
    });

    // Calculate shipping cost
    let shippingTotal = 0;
    if (shippingMethodId && this.shippingService) {
      const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
      shippingTotal = await this.shippingService.calculateShippingCost(shippingMethodId, subtotal);
    }

    const orderNumber = generateOrderNumber();
    const order = await this.orderRepo.create({
      orderNumber,
      customerId: customerId || null,
      guestEmail: customerId ? null : guestEmail,
      guestFirstName: customerId ? null : guestFirstName,
      guestLastName: customerId ? null : guestLastName,
      subtotal: amount,
      shippingTotal,
      taxTotal: 0,
      discountTotal: 0,
      total: amount + shippingTotal,
      currency: 'EUR',
      shippingAddressId,
    });

    await this.orderRepo.createItems(
      orderItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: cart.items.find((ci) => ci.productId === item.productId)?.product.name ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    );

    await this.orderRepo.addStatusHistory({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'pending',
      note: `Order created from ${providerId} payment`,
    });

    const payment = await this.paymentRepo.create({
      orderId: order.id,
      provider: providerId,
      status: 'succeeded',
      amount,
      currency: 'EUR',
      externalId,
      metadata: { externalId },
    });

    await this.orderRepo.updateStatus(order.id, 'confirmed');
    await this.orderRepo.addStatusHistory({
      orderId: order.id,
      fromStatus: 'pending',
      toStatus: 'confirmed',
      note: `${providerId} payment confirmed`,
    });

    await this.cartRepo.clearCart(cartId);
    if (customerId) {
      await this.customerRepo.incrementOrderStats(customerId, amount);
    }

    await this.events.emit(PAYMENT_EVENTS.SUCCEEDED, { payment, order });
    await this.events.emit(ORDER_EVENTS.CREATED, { order });

    logger.info(
      { orderId: order.id, orderNumber, externalId, isGuest: !customerId },
      'Order created from webhook',
    );
  }

  private async handlePaymentFailed(providerId: string, externalId: string, errorMessage?: string) {
    logger.warn({ providerId, externalId, error: errorMessage }, 'Payment failed');

    const existing = await this.paymentRepo.findByExternalId(externalId);
    if (existing) {
      await this.paymentRepo.updateStatus(existing.id, 'failed');
      await this.paymentRepo.addTransaction({
        paymentId: existing.id,
        type: 'charge',
        amount: existing.amount,
        status: 'failed',
        externalId,
        errorMessage,
      });
    }

    await this.events.emit(PAYMENT_EVENTS.FAILED, { providerId, externalId, error: errorMessage });
  }

  /** Complete a demo/prepayment order (no external provider) */
  async completeDemoPayment(input: {
    cartId: string;
    customerEmail: string;
    shippingMethodId?: string;
    shippingAddress: {
      firstName: string;
      lastName: string;
      addressLine1: string;
      city: string;
      postalCode: string;
      country: string;
    };
  }): Promise<{ orderId: string; orderNumber: string }> {
    const cart = await this.cartRepo.findById(input.cartId);
    if (!cart) throw new NotFoundError('Cart', input.cartId);
    if (cart.items.length === 0) throw new ValidationError('Cart is empty');

    // Check for existing customer — if found, use them. Otherwise, guest order.
    const existingCustomer = await this.customerRepo.findByEmail(input.customerEmail);
    const customerId = existingCustomer?.id ?? null;

    // Only create address record for registered customers
    let shippingAddressId: string | undefined;
    if (customerId) {
      const addressResult = await this.customerRepo.createAddress({
        customerId,
        ...input.shippingAddress,
      });
      shippingAddressId = addressResult.id;
    }

    const orderItems = cart.items.map((item) => {
      const unitPrice = item.variant?.price ?? item.product.price;
      return {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // Calculate shipping cost
    let shippingTotal = 0;
    if (input.shippingMethodId && this.shippingService) {
      shippingTotal = await this.shippingService.calculateShippingCost(
        input.shippingMethodId,
        subtotal,
      );
    }

    const orderNumber = generateOrderNumber();

    const order = await this.orderRepo.create({
      orderNumber,
      customerId,
      guestEmail: customerId ? null : input.customerEmail,
      guestFirstName: customerId ? null : input.shippingAddress.firstName,
      guestLastName: customerId ? null : input.shippingAddress.lastName,
      subtotal,
      shippingTotal,
      taxTotal: 0,
      discountTotal: 0,
      total: subtotal + shippingTotal,
      currency: 'EUR',
      shippingAddressId,
    });

    await this.orderRepo.createItems(
      orderItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: cart.items.find((ci) => ci.productId === item.productId)?.product.name ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    );

    await this.orderRepo.addStatusHistory({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'pending',
      note: 'Prepayment order created',
    });

    await this.paymentRepo.create({
      orderId: order.id,
      provider: 'prepayment',
      status: 'pending',
      amount: subtotal,
      currency: 'EUR',
      externalId: `prepay_${order.id}`,
    });

    await this.cartRepo.clearCart(input.cartId);

    logger.info({ orderId: order.id, orderNumber }, 'Prepayment order created');

    await this.events.emit(ORDER_EVENTS.CREATED, { order });

    return { orderId: order.id, orderNumber };
  }

  /** Get payment by ID */
  async getById(id: string) {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) throw new NotFoundError('Payment', id);
    return payment;
  }

  /** Get payment by order ID */
  async getByOrderId(orderId: string) {
    return this.paymentRepo.findByOrderId(orderId);
  }
}
