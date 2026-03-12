import { Hono } from 'hono';
import type { CartService } from '@forkcart/core';
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
  IdParamSchema,
} from '@forkcart/shared';
import { z } from 'zod';

const CreateCartSchema = z.object({
  sessionId: z.string().min(1).optional(),
  customerId: z.string().uuid().optional(),
});

/** Cart API routes */
export function createCartRoutes(cartService: CartService) {
  const router = new Hono();

  /** Create a new cart */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateCartSchema.parse(body);

    const cart = await cartService.create(input);
    return c.json({ data: cart }, 201);
  });

  /** Get cart by ID */
  router.get('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const cart = await cartService.getById(id);
    return c.json({ data: cart });
  });

  /** Add item to cart */
  router.post('/:id/items', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = AddCartItemSchema.parse(body);

    const cart = await cartService.addItem(id, input);
    return c.json({ data: cart }, 201);
  });

  /** Update cart item quantity */
  router.put('/:id/items/:itemId', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const { id: itemId } = IdParamSchema.parse({ id: c.req.param('itemId') });
    const body = await c.req.json();
    const input = UpdateCartItemSchema.parse(body);

    const cart = await cartService.updateItem(id, itemId, input);
    return c.json({ data: cart });
  });

  /** Remove item from cart */
  router.delete('/:id/items/:itemId', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const { id: itemId } = IdParamSchema.parse({ id: c.req.param('itemId') });

    const cart = await cartService.removeItem(id, itemId);
    return c.json({ data: cart });
  });

  /** Clear cart (remove all items) */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const cart = await cartService.clear(id);
    return c.json({ data: cart });
  });

  return router;
}
