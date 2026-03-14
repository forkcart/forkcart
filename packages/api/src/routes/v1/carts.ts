import { Hono } from 'hono';
import type { CartService } from '@forkcart/core';
import { AddCartItemSchema, UpdateCartItemSchema, IdParamSchema } from '@forkcart/shared';
import { z } from 'zod';

const CreateCartSchema = z.object({
  sessionId: z.string().min(1).optional(),
  customerId: z.string().uuid().optional(),
});

const QuickCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).default(1),
        variantId: z.string().uuid().optional(),
      }),
    )
    .min(1)
    .max(10),
  sessionId: z.string().optional(),
});

/** Extract locale from Hono context (set by i18n middleware) */
function getLocale(c: { get: (key: string) => unknown }): string | undefined {
  return (c.get('locale') as string) ?? undefined;
}

/** Cart API routes */
export function createCartRoutes(cartService: CartService) {
  const router = new Hono();

  /** Quick-cart: create a cart with items in one step and return checkout URL */
  router.post('/quick', async (c) => {
    const body = await c.req.json();
    const input = QuickCartSchema.parse(body);
    const locale = getLocale(c);

    const cart = await cartService.create(
      {
        sessionId: input.sessionId ?? `quick_${Date.now()}`,
      },
      locale,
    );

    const errors: Array<{ productId: string; error: string }> = [];

    for (const item of input.items) {
      try {
        await cartService.addItem(
          cart.id,
          {
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId,
          },
          locale,
        );
      } catch (err) {
        errors.push({
          productId: item.productId,
          error: err instanceof Error ? err.message : 'Failed to add item',
        });
      }
    }

    const updatedCart = await cartService.getById(cart.id, locale);

    if (updatedCart.items.length === 0) {
      return c.json(
        {
          error: { message: 'No valid products could be added to cart', details: errors },
        },
        400,
      );
    }

    return c.json(
      {
        data: {
          ...updatedCart,
          checkoutUrl: `/checkout?cartId=${cart.id}`,
          ...(errors.length > 0 ? { warnings: errors } : {}),
        },
      },
      201,
    );
  });

  /** Create a new cart */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateCartSchema.parse(body);

    const cart = await cartService.create(input, getLocale(c));
    return c.json({ data: cart }, 201);
  });

  /** Get cart by ID */
  router.get('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const cart = await cartService.getById(id, getLocale(c));
    return c.json({ data: cart });
  });

  /** Add item to cart */
  router.post('/:id/items', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = AddCartItemSchema.parse(body);

    const cart = await cartService.addItem(id, input, getLocale(c));
    return c.json({ data: cart }, 201);
  });

  /** Update cart item quantity */
  router.put('/:id/items/:itemId', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const { id: itemId } = IdParamSchema.parse({ id: c.req.param('itemId') });
    const body = await c.req.json();
    const input = UpdateCartItemSchema.parse(body);

    const cart = await cartService.updateItem(id, itemId, input, getLocale(c));
    return c.json({ data: cart });
  });

  /** Remove item from cart */
  router.delete('/:id/items/:itemId', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const { id: itemId } = IdParamSchema.parse({ id: c.req.param('itemId') });

    const cart = await cartService.removeItem(id, itemId, getLocale(c));
    return c.json({ data: cart });
  });

  /** Clear cart (remove all items) */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const cart = await cartService.clear(id, getLocale(c));
    return c.json({ data: cart });
  });

  return router;
}
