import { Hono } from 'hono';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Database } from '@forkcart/database';
import { apiKeys, eq } from '@forkcart/database';
import { requireRole } from '../../middleware/permissions';

const API_KEY_PREFIX = 'fc_live_';
const BCRYPT_ROUNDS = 12;

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional(),
});

const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permissions: z.array(z.string()).optional(),
});

/** API Key management routes (admin JWT required) */
export function createApiKeyRoutes(db: Database) {
  const router = new Hono();

  // All routes require admin or superadmin
  router.use('*', requireRole('admin', 'superadmin'));

  /** POST /api-keys — Create a new API key */
  router.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const input = CreateApiKeySchema.parse(body);

    // Generate key: fc_live_ + 32 hex chars
    const rawKey = API_KEY_PREFIX + randomBytes(16).toString('hex');
    const prefix = rawKey.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + 8);
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

    const [created] = await db
      .insert(apiKeys)
      .values({
        keyHash,
        prefix,
        name: input.name,
        userId: user.id,
        permissions: input.permissions,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      })
      .returning({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        permissions: apiKeys.permissions,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      });

    // Return the full key ONCE — it's never shown again
    return c.json(
      {
        data: {
          ...created,
          key: rawKey,
          displayKey: `${API_KEY_PREFIX}${prefix}...`,
        },
      },
      201,
    );
  });

  /** GET /api-keys — List all keys (prefix only, never full key) */
  router.get('/', async (c) => {
    const user = c.get('user');

    const keys = await db
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        permissions: apiKeys.permissions,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .orderBy(apiKeys.createdAt);

    return c.json({
      data: keys.map((k) => ({
        ...k,
        displayKey: `${API_KEY_PREFIX}${k.prefix}...`,
      })),
    });
  });

  /** PATCH /api-keys/:id — Update name/permissions */
  router.patch('/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const input = UpdateApiKeySchema.parse(body);

    const [existing] = await db
      .select({ id: apiKeys.id, userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!existing || existing.userId !== user.id) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.permissions !== undefined) updateData['permissions'] = input.permissions;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Nothing to update' } }, 400);
    }

    const [updated] = await db.update(apiKeys).set(updateData).where(eq(apiKeys.id, id)).returning({
      id: apiKeys.id,
      prefix: apiKeys.prefix,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    });

    return c.json({
      data: { ...updated, displayKey: `${API_KEY_PREFIX}${updated!.prefix}...` },
    });
  });

  /** DELETE /api-keys/:id — Revoke key */
  router.delete('/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');

    const [existing] = await db
      .select({ id: apiKeys.id, userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!existing || existing.userId !== user.id) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, id));

    return c.json({ data: { message: 'API key revoked' } });
  });

  return router;
}
