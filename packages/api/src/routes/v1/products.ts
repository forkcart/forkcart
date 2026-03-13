import { Hono } from 'hono';
import type { ProductService, MediaService, ProductTranslationService } from '@forkcart/core';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductFilterSchema,
  PaginationSchema,
  IdParamSchema,
} from '@forkcart/shared';

/** Product CRUD routes */
export function createProductRoutes(
  productService: ProductService,
  mediaService?: MediaService,
  productTranslationService?: ProductTranslationService,
) {
  const router = new Hono();

  /** Resolve locale from query param or Accept-Language header */
  function resolveLocale(c: {
    req: { query: (k: string) => string | undefined };
    get: (k: string) => string;
  }): string | null {
    const queryLocale = c.req.query('locale');
    if (queryLocale && queryLocale !== 'en') return queryLocale;
    const ctxLocale = c.get('locale') as string | undefined;
    if (ctxLocale && ctxLocale !== 'en') return ctxLocale;
    return null;
  }

  /** Merge translation fields over product (non-null fields override) */
  function mergeTranslation<T extends Record<string, unknown>>(
    product: T,
    translation: {
      name: string | null;
      description: string | null;
      shortDescription: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
    } | null,
  ): T {
    if (!translation) return product;
    const merged = { ...product };
    if (translation.name) merged['name' as keyof T] = translation.name as T[keyof T];
    if (translation.description)
      merged['description' as keyof T] = translation.description as T[keyof T];
    if (translation.shortDescription)
      merged['shortDescription' as keyof T] = translation.shortDescription as T[keyof T];
    if (translation.metaTitle) merged['metaTitle' as keyof T] = translation.metaTitle as T[keyof T];
    if (translation.metaDescription)
      merged['metaDescription' as keyof T] = translation.metaDescription as T[keyof T];
    return merged;
  }

  /** List products with filtering and pagination */
  router.get('/', async (c) => {
    const query = c.req.query();
    const filter = ProductFilterSchema.parse(query);
    const pagination = PaginationSchema.parse(query);

    const result = await productService.list(filter, pagination);
    const locale = resolveLocale(c);

    // Attach images and merge translations
    if (result.data?.length) {
      const enriched = await Promise.all(
        result.data.map(async (p: { id: string }) => {
          let product = { ...p };

          // Images
          if (mediaService) {
            const media = await mediaService.getByEntity('product', p.id);
            (product as Record<string, unknown>)['images'] = media.map((m) => ({
              id: m.id,
              url: m.url,
              alt: m.alt,
              sortOrder: m.sortOrder,
            }));
          }

          // Translation overlay
          if (locale && productTranslationService) {
            const translation = await productTranslationService.getTranslation(p.id, locale);
            product = mergeTranslation(product, translation);
          }

          return product;
        }),
      );
      return c.json({ ...result, data: enriched });
    }

    return c.json(result);
  });

  /** Get product by ID */
  router.get('/:id', async (c) => {
    const id = c.req.param('id');

    // Try UUID first, then slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const product = isUuid ? await productService.getById(id) : await productService.getBySlug(id);

    // Attach images if media service available
    let images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }> = [];
    if (mediaService) {
      const media = await mediaService.getByEntity('product', product.id);
      images = media.map((m) => ({ id: m.id, url: m.url, alt: m.alt, sortOrder: m.sortOrder }));
    }

    let productData = { ...product, images };

    // Merge translation if locale requested
    const locale = resolveLocale(c);
    if (locale && productTranslationService) {
      const translation = await productTranslationService.getTranslation(product.id, locale);
      productData = mergeTranslation(productData, translation);
    }

    return c.json({ data: productData });
  });

  /** Create product */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateProductSchema.parse(body);

    const product = await productService.create(input);
    return c.json({ data: product }, 201);
  });

  /** Update product */
  router.put('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateProductSchema.parse(body);

    const product = await productService.update(id, input);
    return c.json({ data: product });
  });

  /** Delete product */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await productService.delete(id);
    return c.json({ success: true }, 200);
  });

  return router;
}
