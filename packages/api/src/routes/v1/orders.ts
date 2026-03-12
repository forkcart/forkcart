import { Hono } from 'hono';
import type { OrderService } from '@forkcart/core';
import {
  CreateOrderSchema,
  PaginationSchema,
  IdParamSchema,
  OrderStatusSchema,
} from '@forkcart/shared';
import { z } from 'zod';

const OrderFilterSchema = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const UpdateStatusSchema = z.object({
  status: OrderStatusSchema,
  note: z.string().max(500).optional(),
});

/** Order CRUD routes */
export function createOrderRoutes(orderService: OrderService) {
  const router = new Hono();

  /** Get order stats (must be before /:id) */
  router.get('/stats', async (c) => {
    const stats = await orderService.getStats();
    return c.json({ data: stats });
  });

  /** List orders with filtering and pagination */
  router.get('/', async (c) => {
    const query = c.req.query();
    const filter = OrderFilterSchema.parse(query);
    const pagination = PaginationSchema.parse(query);

    const result = await orderService.list(filter, pagination);
    return c.json(result);
  });

  /** Get order by ID */
  router.get('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const order = await orderService.getById(id);
    return c.json({ data: order });
  });

  /** Create order */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateOrderSchema.parse(body);
    const order = await orderService.create(input);
    return c.json({ data: order }, 201);
  });

  /** Update order status */
  router.put('/:id/status', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const { status, note } = UpdateStatusSchema.parse(body);
    const order = await orderService.updateStatus(id, status, note);
    return c.json({ data: order });
  });

  return router;
}
