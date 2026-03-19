import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from '../service';
import type { OrderRepository } from '../repository';
import type { VariantRepository } from '../../variants/repository';
import type { EventBus } from '../../plugins/event-bus';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const NOW = new Date('2026-03-19T12:00:00Z');

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-20260319-AB12',
    customerId: null,
    guestEmail: 'test@example.com',
    status: 'pending',
    subtotal: 3998,
    shippingTotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    total: 3998,
    currency: 'EUR',
    items: [],
    statusHistory: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'var-1',
    productId: 'prod-1',
    name: 'Default',
    price: 1999,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

function createMockOrderRepo(): OrderRepository {
  return {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createItems: vi.fn(),
    addStatusHistory: vi.fn(),
    updateStatus: vi.fn(),
    findByCustomerId: vi.fn(),
    linkGuestOrders: vi.fn(),
    getStats: vi.fn(),
  } as unknown as OrderRepository;
}

function createMockVariantRepo(): VariantRepository {
  return {
    findById: vi.fn(),
    findByProductId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as VariantRepository;
}

function createMockEventBus(): EventBus {
  return { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: ReturnType<typeof createMockOrderRepo>;
  let variantRepo: ReturnType<typeof createMockVariantRepo>;
  let events: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    orderRepo = createMockOrderRepo();
    variantRepo = createMockVariantRepo();
    events = createMockEventBus();
    service = new OrderService({
      orderRepository: orderRepo as unknown as OrderRepository,
      variantRepository: variantRepo as unknown as VariantRepository,
      eventBus: events as unknown as EventBus,
    });
  });

  /* ---- getById -------------------------------------------------- */

  describe('getById', () => {
    it('returns order when found', async () => {
      const order = makeOrder();
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      const result = await service.getById('order-1');

      expect(result).toEqual(order);
    });

    it('throws NotFoundError when order does not exist', async () => {
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getById('nope')).rejects.toThrow();
    });
  });

  /* ---- create --------------------------------------------------- */

  describe('create', () => {
    it('creates an order with server-validated prices', async () => {
      const variant = makeVariant({ price: 1999 });
      const createdOrder = makeOrder();

      (variantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(variant);
      (orderRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdOrder);
      (orderRepo.createItems as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(createdOrder);

      const result = await service.create({
        guestEmail: 'test@example.com',
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            quantity: 2,
            unitPrice: 9999, // client price — should be IGNORED
            totalPrice: 19998,
          },
        ],
      });

      expect(result).toBeDefined();
      // Verify server-side price was used
      expect(orderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 3998, // 1999 * 2
          total: 3998,
        }),
      );
      expect(orderRepo.createItems).toHaveBeenCalledWith([
        expect.objectContaining({
          unitPrice: 1999,
          totalPrice: 3998,
        }),
      ]);
      expect(events.emit).toHaveBeenCalledWith('order.created', expect.anything());
    });

    it('throws when variantId is missing', async () => {
      await expect(
        service.create({
          items: [
            {
              productId: 'prod-1',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        }),
      ).rejects.toThrow('Variant ID is required');
    });

    it('throws when variant not found', async () => {
      (variantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.create({
          items: [
            {
              productId: 'prod-1',
              variantId: 'nope',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        }),
      ).rejects.toThrow('Variant not found');
    });

    it('throws when variant has no price', async () => {
      (variantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeVariant({ price: null }),
      );

      await expect(
        service.create({
          items: [
            {
              productId: 'prod-1',
              variantId: 'var-1',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        }),
      ).rejects.toThrow('has no price set');
    });

    it('generates order number with correct format', async () => {
      const variant = makeVariant();
      (variantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(variant);
      (orderRepo.create as ReturnType<typeof vi.fn>).mockImplementation(async (data) => ({
        ...makeOrder(),
        orderNumber: data.orderNumber,
      }));
      (orderRepo.createItems as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeOrder());

      await service.create({
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
      });

      const call = (orderRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    });

    it('records initial status history entry', async () => {
      const variant = makeVariant();
      const order = makeOrder();

      (variantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(variant);
      (orderRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(order);
      (orderRepo.createItems as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      await service.create({
        items: [
          {
            productId: 'prod-1',
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
      });

      expect(orderRepo.addStatusHistory).toHaveBeenCalledWith({
        orderId: 'order-1',
        fromStatus: null,
        toStatus: 'pending',
        note: 'Order created',
      });
    });
  });

  /* ---- updateStatus --------------------------------------------- */

  describe('updateStatus', () => {
    it('transitions pending → confirmed', async () => {
      const order = makeOrder({ status: 'pending' });
      const updated = makeOrder({ status: 'confirmed' });

      (orderRepo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(order)
        .mockResolvedValue(updated);
      (orderRepo.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.updateStatus('order-1', 'confirmed');

      expect(result!.status).toBe('confirmed');
      expect(orderRepo.addStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: 'pending',
          toStatus: 'confirmed',
        }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        'order.status_changed',
        expect.objectContaining({ fromStatus: 'pending', toStatus: 'confirmed' }),
      );
    });

    it('transitions pending → cancelled', async () => {
      const order = makeOrder({ status: 'pending' });
      const updated = makeOrder({ status: 'cancelled' });

      (orderRepo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(order)
        .mockResolvedValue(updated);
      (orderRepo.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.updateStatus('order-1', 'cancelled');

      expect(result!.status).toBe('cancelled');
    });

    it('rejects invalid transition pending → shipped', async () => {
      const order = makeOrder({ status: 'pending' });
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      await expect(service.updateStatus('order-1', 'shipped')).rejects.toThrow(
        /Cannot transition from "pending" to "shipped"/,
      );
    });

    it('rejects transition from terminal state cancelled', async () => {
      const order = makeOrder({ status: 'cancelled' });
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      await expect(service.updateStatus('order-1', 'pending')).rejects.toThrow(/Cannot transition/);
    });

    it('rejects transition from terminal state refunded', async () => {
      const order = makeOrder({ status: 'refunded' });
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(order);

      await expect(service.updateStatus('order-1', 'pending')).rejects.toThrow(/Cannot transition/);
    });

    it('throws NotFoundError for unknown order', async () => {
      (orderRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.updateStatus('nope', 'confirmed')).rejects.toThrow();
    });

    it('includes note in status history', async () => {
      const order = makeOrder({ status: 'pending' });
      const updated = makeOrder({ status: 'confirmed' });

      (orderRepo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(order)
        .mockResolvedValue(updated);
      (orderRepo.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(updated);
      (orderRepo.addStatusHistory as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.updateStatus('order-1', 'confirmed', 'Payment received');

      expect(orderRepo.addStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({ note: 'Payment received' }),
      );
    });
  });
});
