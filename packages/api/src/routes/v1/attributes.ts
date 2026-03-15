import { Hono } from 'hono';
import { z } from 'zod';
import type { AttributeService } from '@forkcart/core';
import { IdParamSchema } from '@forkcart/shared';

const CreateAttributeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  type: z.string().max(50).default('text'),
  values: z.array(z.unknown()).default([]),
  sortOrder: z.number().int().default(0),
});

const UpdateAttributeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  type: z.string().max(50).optional(),
  values: z.array(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});

/** Attribute CRUD routes */
export function createAttributeRoutes(attributeService: AttributeService) {
  const router = new Hono();

  /** List all attributes */
  router.get('/', async (c) => {
    const attributes = await attributeService.listAll();
    return c.json({ data: attributes });
  });

  /** Get single attribute */
  router.get('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const attribute = await attributeService.getById(id);
    return c.json({ data: attribute });
  });

  /** Create attribute */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = CreateAttributeSchema.parse(body);
    const attribute = await attributeService.create(input);
    return c.json({ data: attribute }, 201);
  });

  /** Update attribute */
  router.put('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const body = await c.req.json();
    const input = UpdateAttributeSchema.parse(body);
    const attribute = await attributeService.update(id, input);
    return c.json({ data: attribute });
  });

  /** Delete attribute */
  router.delete('/:id', async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await attributeService.delete(id);
    return c.json({ success: true });
  });

  return router;
}
