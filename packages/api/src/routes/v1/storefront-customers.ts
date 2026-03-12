import { Hono } from 'hono';
import type { CustomerAuthService, CustomerRepository, OrderRepository } from '@forkcart/core';
import { AddressSchema } from '@forkcart/shared';
import { createCustomerAuthMiddleware } from '../../middleware/customer-auth';

/** Storefront customer routes — protected by customer auth */
export function createStorefrontCustomerRoutes(
  customerAuthService: CustomerAuthService,
  customerRepository: CustomerRepository,
  orderRepository: OrderRepository,
) {
  const router = new Hono();
  const requireAuth = createCustomerAuthMiddleware(customerAuthService);

  /** Verify customer owns the resource */
  function verifyOwnership(
    c: { get: (key: 'customer') => { id: string; email: string } },
    customerId: string,
  ): boolean {
    return c.get('customer').id === customerId;
  }

  /** Get customer addresses */
  router.get('/:customerId/addresses', requireAuth, async (c) => {
    const customerId = c.req.param('customerId') as string;
    if (!verifyOwnership(c, customerId)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const addresses = await customerRepository.findAddressesByCustomerId(customerId);
    return c.json({ data: addresses });
  });

  /** Create a new address */
  router.post('/:customerId/addresses', requireAuth, async (c) => {
    const customerId = c.req.param('customerId') as string;
    if (!verifyOwnership(c, customerId)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const body = await c.req.json();
    const input = AddressSchema.parse(body);

    if (input.isDefault) {
      await customerRepository.clearDefaultAddresses(customerId);
    }

    const address = await customerRepository.createAddress({
      customerId,
      ...input,
    });

    return c.json({ data: address }, 201);
  });

  /** Update an address */
  router.put('/:customerId/addresses/:addressId', requireAuth, async (c) => {
    const customerId = c.req.param('customerId') as string;
    const addressId = c.req.param('addressId') as string;

    if (!verifyOwnership(c, customerId)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const existing = await customerRepository.findAddressById(addressId);
    if (!existing || existing.customerId !== customerId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Address not found' } }, 404);
    }

    const body = await c.req.json();
    const input = AddressSchema.partial().parse(body);

    if (input.isDefault) {
      await customerRepository.clearDefaultAddresses(customerId);
    }

    const address = await customerRepository.updateAddress(addressId, input);
    return c.json({ data: address });
  });

  /** Delete an address */
  router.delete('/:customerId/addresses/:addressId', requireAuth, async (c) => {
    const customerId = c.req.param('customerId') as string;
    const addressId = c.req.param('addressId') as string;

    if (!verifyOwnership(c, customerId)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const existing = await customerRepository.findAddressById(addressId);
    if (!existing || existing.customerId !== customerId) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Address not found' } }, 404);
    }

    await customerRepository.deleteAddress(addressId);
    return c.json({ data: { message: 'Address deleted' } });
  });

  /** Get customer orders */
  router.get('/:customerId/orders', requireAuth, async (c) => {
    const customerId = c.req.param('customerId') as string;

    if (!verifyOwnership(c, customerId)) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const orders = await orderRepository.findByCustomerId(customerId);
    return c.json({ data: orders });
  });

  return router;
}
