import { Hono } from 'hono';
import { z } from 'zod';
import type { CurrencyService } from '@forkcart/core';
import { requireRole } from '../../middleware/permissions';

const CreateCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  decimalPlaces: z.number().int().min(0).max(4).default(2),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  exchangeRate: z.number().int().min(1).optional(),
});

const UpdateCurrencySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().min(1).max(10).optional(),
  decimalPlaces: z.number().int().min(0).max(4).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  exchangeRate: z.number().int().min(1).optional(),
  autoUpdate: z.boolean().optional(),
});

const UpsertProductPriceSchema = z.object({
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).nullable().optional(),
});

/** Admin currency CRUD routes */
export function createCurrencyRoutes(currencyService: CurrencyService) {
  const router = new Hono();

  /** List all currencies (admin — includes inactive) */
  router.get('/all', async (c) => {
    const data = await currencyService.listAll();
    return c.json({ data });
  });

  /** Get single currency */
  router.get('/:code', async (c) => {
    const code = c.req.param('code')!;
    const data = await currencyService.getByCode(code);
    return c.json({ data });
  });

  /** Create currency (admin + superadmin only) */
  router.post('/', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const input = CreateCurrencySchema.parse(body);
    const data = await currencyService.create(input);
    return c.json({ data }, 201);
  });

  /** Update currency (admin + superadmin only) */
  router.put('/:code', requireRole('admin', 'superadmin'), async (c) => {
    const code = c.req.param('code')!;
    const body = await c.req.json();
    const input = UpdateCurrencySchema.parse(body);
    const data = await currencyService.update(code, input);
    return c.json({ data });
  });

  /** Update exchange rate (admin + superadmin only) */
  router.put('/:code/rate', requireRole('admin', 'superadmin'), async (c) => {
    const code = c.req.param('code')!;
    const body = await c.req.json();
    const { exchangeRate } = z.object({ exchangeRate: z.number().int().min(1) }).parse(body);
    const data = await currencyService.updateExchangeRate(code, exchangeRate);
    return c.json({ data });
  });

  /** Refresh exchange rates for auto-update currencies (admin + superadmin only) */
  router.post('/refresh-rates', requireRole('admin', 'superadmin'), async (c) => {
    const results = await currencyService.refreshRates();
    return c.json({ data: results });
  });

  /** Toggle auto-update for a currency (admin + superadmin only) */
  router.put('/:code/auto-update', requireRole('admin', 'superadmin'), async (c) => {
    const code = c.req.param('code')!;
    const body = await c.req.json();
    const { enabled } = z.object({ enabled: z.boolean() }).parse(body);
    const data = await currencyService.setAutoUpdate(code, enabled);
    return c.json({ data });
  });

  /** Delete currency (admin + superadmin only) */
  router.delete('/:code', requireRole('admin', 'superadmin'), async (c) => {
    const code = c.req.param('code')!;
    await currencyService.delete(code);
    return c.json({ success: true });
  });

  /** Get product prices for a specific product */
  router.get('/product-prices/:productId', async (c) => {
    const productId = c.req.param('productId')!;
    const data = await currencyService.getProductPrices(productId);
    return c.json({ data });
  });

  /** Upsert product price for a specific currency */
  router.put(
    '/product-prices/:productId/:currencyCode',
    requireRole('admin', 'superadmin'),
    async (c) => {
      const productId = c.req.param('productId')!;
      const currencyCode = c.req.param('currencyCode')!;
      const body = await c.req.json();
      const input = UpsertProductPriceSchema.parse(body);
      const data = await currencyService.upsertProductPrice(
        productId!,
        currencyCode!,
        input.price,
        input.compareAtPrice,
      );
      return c.json({ data });
    },
  );

  /** Delete product price override */
  router.delete(
    '/product-prices/:productId/:currencyCode',
    requireRole('admin', 'superadmin'),
    async (c) => {
      const productId = c.req.param('productId')!;
      const currencyCode = c.req.param('currencyCode')!;
      await currencyService.deleteProductPrice(productId!, currencyCode!);
      return c.json({ success: true });
    },
  );

  return router;
}

/** Public currency routes (no auth required) */
export function createPublicCurrencyRoutes(currencyService: CurrencyService) {
  const router = new Hono();

  /** List active currencies */
  router.get('/', async (c) => {
    const data = await currencyService.listActive();
    return c.json({ data });
  });

  /** Get product price in a specific currency */
  router.get('/price/:productId', async (c) => {
    const productId = c.req.param('productId')!;
    const currency = c.req.query('currency') ?? c.req.header('X-Currency') ?? 'EUR';

    // We need product base data — this is a lightweight endpoint
    // The caller should provide base price info, or we fetch from context
    const prices = await currencyService.getProductPrices(productId);
    const data = prices.find((p) => p.currencyCode === currency.toUpperCase());

    return c.json({ data: data ?? null, currency: currency.toUpperCase() });
  });

  return router;
}
