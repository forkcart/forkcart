import { Hono } from 'hono';
import type { CustomerService } from '@forkcart/core';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  PaginationSchema,
  IdParamSchema,
} from '@forkcart/shared';
import { z } from 'zod';
import { requireRole } from '../../middleware/permissions';

const CustomerFilterSchema = z.object({
  search: z.string().optional(),
});

/** Customer CRUD routes */
export function createCustomerRoutes(customerService: CustomerService) {
  const router = new Hono();

  /** List customers with pagination */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const query = c.req.query();
    const filter = CustomerFilterSchema.parse(query);
    const pagination = PaginationSchema.parse(query);

    const result = await customerService.list(filter, pagination);
    return c.json(result);
  });

  /** Get customer by ID (with addresses + order history) */
  router.get('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const customer = await customerService.getById(id);
    return c.json({ data: customer });
  });

  /** Create customer */
  router.post('/', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateCustomerSchema.parse(body);
    const customer = await customerService.create(input);
    return c.json({ data: customer }, 201);
  });

  /** Update customer */
  router.put('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateCustomerSchema.parse(body);
    const customer = await customerService.update(id, input);
    return c.json({ data: customer });
  });

  return router;
}
