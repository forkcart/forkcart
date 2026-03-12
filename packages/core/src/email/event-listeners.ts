import type { EventBus } from '../plugins/event-bus';
import type { EmailService } from './service';
import { ORDER_EVENTS } from '../orders/events';
import { CUSTOMER_EVENTS } from '../customers/events';
import { createLogger } from '../lib/logger';

const logger = createLogger('email-events');

/**
 * Register email event listeners on the EventBus.
 * Sends transactional emails when domain events fire.
 */
export function registerEmailEventListeners(eventBus: EventBus, emailService: EmailService): void {
  // Order placed → send confirmation email
  eventBus.on(ORDER_EVENTS.CREATED, async (event) => {
    try {
      const { order } = event.payload as {
        order: {
          orderNumber: string;
          customer?: { email: string; firstName: string; lastName: string };
          items?: Array<{
            productName: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
          }>;
          subtotal: number;
          shippingTotal: number;
          taxTotal: number;
          total: number;
          currency: string;
          shippingAddress?: {
            firstName: string;
            lastName: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            postalCode: string;
            country: string;
          };
          billingAddress?: {
            firstName: string;
            lastName: string;
            addressLine1: string;
            addressLine2?: string;
            city: string;
            postalCode: string;
            country: string;
          };
        };
      };

      if (!order.customer?.email) {
        logger.warn({ orderNumber: order.orderNumber }, 'No customer email for order confirmation');
        return;
      }

      await emailService.sendOrderConfirmation(order.customer.email, {
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        items: (order.items ?? []).map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal: order.subtotal,
        shippingTotal: order.shippingTotal,
        taxTotal: order.taxTotal,
        total: order.total,
        currency: order.currency,
        shippingAddress: order.shippingAddress ?? {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          addressLine1: '',
          city: '',
          postalCode: '',
          country: 'DE',
        },
        billingAddress: order.billingAddress,
      });

      logger.info({ orderNumber: order.orderNumber }, 'Order confirmation email sent');
    } catch (error) {
      logger.error(
        { error, eventType: ORDER_EVENTS.CREATED },
        'Failed to send order confirmation email',
      );
    }
  });

  // Order status changed to shipped → send shipping notification
  eventBus.on(ORDER_EVENTS.STATUS_CHANGED, async (event) => {
    try {
      const { order, toStatus } = event.payload as {
        order: {
          orderNumber: string;
          customer?: { email: string; firstName: string; lastName: string };
          metadata?: Record<string, unknown>;
        };
        toStatus: string;
      };

      if (toStatus !== 'shipped') return;

      if (!order.customer?.email) {
        logger.warn(
          { orderNumber: order.orderNumber },
          'No customer email for shipping notification',
        );
        return;
      }

      const metadata = (order.metadata ?? {}) as Record<string, string>;

      await emailService.sendOrderShipped(order.customer.email, {
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        trackingUrl: metadata['trackingUrl'],
        trackingNumber: metadata['trackingNumber'],
        carrier: metadata['carrier'],
        estimatedDelivery: metadata['estimatedDelivery'],
      });

      logger.info({ orderNumber: order.orderNumber }, 'Order shipped email sent');
    } catch (error) {
      logger.error(
        { error, eventType: ORDER_EVENTS.STATUS_CHANGED },
        'Failed to send shipping email',
      );
    }
  });

  // Order status changed to delivered → send delivery confirmation
  eventBus.on(ORDER_EVENTS.STATUS_CHANGED, async (event) => {
    try {
      const { order, toStatus } = event.payload as {
        order: {
          orderNumber: string;
          customer?: { email: string; firstName: string; lastName: string };
        };
        toStatus: string;
      };

      if (toStatus !== 'delivered') return;

      if (!order.customer?.email) return;

      await emailService.sendOrderDelivered(order.customer.email, {
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      });

      logger.info({ orderNumber: order.orderNumber }, 'Order delivered email sent');
    } catch (error) {
      logger.error({ error }, 'Failed to send delivery email');
    }
  });

  // Customer registered → send welcome email
  eventBus.on(CUSTOMER_EVENTS.CREATED, async (event) => {
    try {
      const { customer } = event.payload as {
        customer: { email: string; firstName: string; lastName: string };
      };

      if (!customer.email) return;

      await emailService.sendWelcome(customer.email, {
        customerName: `${customer.firstName} ${customer.lastName}`,
      });

      logger.info({ email: customer.email }, 'Welcome email sent');
    } catch (error) {
      logger.error({ error }, 'Failed to send welcome email');
    }
  });

  logger.info('Email event listeners registered');
}
