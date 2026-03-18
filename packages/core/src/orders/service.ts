import type { CreateOrderInput, Pagination } from '@forkcart/shared';
import { ORDER_STATUS_TRANSITIONS } from '@forkcart/shared';
import type { OrderStatus } from '@forkcart/shared';
import { NotFoundError, ValidationError } from '@forkcart/shared';
import type { OrderRepository, OrderFilter } from './repository';
import type { VariantRepository } from '../variants/repository';
import type { EventBus } from '../plugins/event-bus';
import { ORDER_EVENTS } from './events';
import { createLogger } from '../lib/logger';
import crypto from 'node:crypto';

const logger = createLogger('order-service');

export interface OrderServiceDeps {
  orderRepository: OrderRepository;
  variantRepository: VariantRepository;
  eventBus: EventBus;
}

/** Generate order number: ORD-YYYYMMDD-XXXX (RVS-031: cryptographically secure) */
function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `ORD-${date}-${random}`;
}

export class OrderService {
  private readonly repo: OrderRepository;
  private readonly variantRepo: VariantRepository;
  private readonly events: EventBus;

  constructor(deps: OrderServiceDeps) {
    this.repo = deps.orderRepository;
    this.variantRepo = deps.variantRepository;
    this.events = deps.eventBus;
  }

  async getById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) {
      throw new NotFoundError('Order', id);
    }
    return order;
  }

  async list(filter: OrderFilter, pagination: Pagination) {
    return this.repo.findMany(filter, pagination);
  }

  async create(input: CreateOrderInput) {
    // Validate and calculate prices server-side (never trust client-supplied prices)
    const itemsWithPrices = await Promise.all(
      input.items.map(async (item) => {
        if (!item.variantId) {
          throw new ValidationError(
            `Variant ID is required for item with product: ${item.productId}`,
          );
        }

        const variant = await this.variantRepo.findById(item.variantId);
        if (!variant) {
          throw new ValidationError(`Variant not found: ${item.variantId}`);
        }
        if (variant.price === null) {
          throw new ValidationError(`Variant ${item.variantId} has no price set`);
        }

        const serverUnitPrice = variant.price;
        const serverTotalPrice = serverUnitPrice * item.quantity;

        return {
          ...item,
          variantId: item.variantId,
          unitPrice: serverUnitPrice,
          totalPrice: serverTotalPrice,
        };
      }),
    );

    // Calculate totals from server-validated prices
    const subtotal = itemsWithPrices.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal; // Shipping/tax can be added later

    const orderNumber = generateOrderNumber();

    const order = await this.repo.create({
      orderNumber,
      customerId: input.customerId,
      subtotal,
      shippingTotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      total,
      currency: 'EUR',
      shippingAddressId: input.shippingAddressId,
      billingAddressId: input.billingAddressId,
      notes: input.notes,
      metadata: input.metadata,
    });

    // Create order items with server-validated prices
    await this.repo.createItems(
      itemsWithPrices.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: '', // Would be fetched from product in real implementation
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    );

    // Initial status history entry
    await this.repo.addStatusHistory({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'pending',
      note: 'Order created',
    });

    logger.info({ orderId: order.id, orderNumber }, 'Order created');
    await this.events.emit(ORDER_EVENTS.CREATED, { order });

    return this.repo.findById(order.id);
  }

  async updateStatus(id: string, newStatus: OrderStatus, note?: string) {
    const order = await this.repo.findById(id);
    if (!order) {
      throw new NotFoundError('Order', id);
    }

    const currentStatus = order.status as OrderStatus;
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions?.join(', ') ?? 'none'}`,
      );
    }

    const updated = await this.repo.updateStatus(id, newStatus);
    if (!updated) {
      throw new NotFoundError('Order', id);
    }

    await this.repo.addStatusHistory({
      orderId: id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      note,
    });

    logger.info({ orderId: id, from: currentStatus, to: newStatus }, 'Order status changed');
    await this.events.emit(ORDER_EVENTS.STATUS_CHANGED, {
      order: updated,
      fromStatus: currentStatus,
      toStatus: newStatus,
    });

    return this.repo.findById(id);
  }

  async getStats() {
    return this.repo.getStats();
  }
}
