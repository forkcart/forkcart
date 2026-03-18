import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@forkcart/database';
import {
  cookieConsentCategories,
  cookieConsentSettings,
  cookieConsentLogs,
  eq,
  and,
} from '@forkcart/database';
import { requireRole } from '../../middleware/permissions';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CategorySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z_]+$/),
  label: z.string().min(1).max(255),
  description: z.string().min(1),
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const SettingsUpdateSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
  }),
);

const ConsentLogSchema = z.object({
  sessionId: z.string().optional(),
  consent: z.record(z.string(), z.boolean()),
  customerId: z.string().uuid().optional(),
});

// ─── Admin routes (auth-protected) ────────────────────────────────────────────

export function createCookieConsentRoutes(db: Database) {
  const router = new Hono();

  /** GET /categories — list all categories */
  router.get('/categories', async (c) => {
    const rows = await db
      .select()
      .from(cookieConsentCategories)
      .orderBy(cookieConsentCategories.sortOrder);
    return c.json({ data: rows });
  });

  /** POST /categories — create new category (admin) */
  router.post('/categories', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const data = CategorySchema.parse(body);
    const [row] = await db.insert(cookieConsentCategories).values(data).returning();
    return c.json({ data: row }, 201);
  });

  /** PUT /categories/:id — update category (admin) */
  router.put('/categories/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const body = await c.req.json();
    const data = CategorySchema.partial().parse(body);
    const [row] = await db
      .update(cookieConsentCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cookieConsentCategories.id, id))
      .returning();
    if (!row) return c.json({ error: { message: 'Category not found' } }, 404);
    return c.json({ data: row });
  });

  /** DELETE /categories/:id — remove category (admin) */
  router.delete('/categories/:id', requireRole('admin', 'superadmin'), async (c) => {
    const id = c.req.param('id') as string;
    const [row] = await db
      .delete(cookieConsentCategories)
      .where(eq(cookieConsentCategories.id, id))
      .returning();
    if (!row) return c.json({ error: { message: 'Category not found' } }, 404);
    return c.json({ data: { deleted: true } });
  });

  /** GET /settings — list all consent settings (optionally filtered by locale) */
  router.get('/settings', async (c) => {
    const locale = c.req.query('locale');
    const rows = locale
      ? await db
          .select()
          .from(cookieConsentSettings)
          .where(eq(cookieConsentSettings.locale, locale))
      : await db.select().from(cookieConsentSettings);
    return c.json({ data: rows });
  });

  /** PUT /settings — bulk update settings for a locale (admin) */
  router.put('/settings', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const locale = c.req.query('locale') ?? 'de';
    const updates = SettingsUpdateSchema.parse(body);
    const now = new Date();
    for (const { key, value } of updates) {
      const existing = await db
        .select()
        .from(cookieConsentSettings)
        .where(and(eq(cookieConsentSettings.key, key), eq(cookieConsentSettings.locale, locale)));
      if (existing.length > 0) {
        await db
          .update(cookieConsentSettings)
          .set({ value, updatedAt: now })
          .where(and(eq(cookieConsentSettings.key, key), eq(cookieConsentSettings.locale, locale)));
      } else {
        await db.insert(cookieConsentSettings).values({ key, value, locale });
      }
    }
    const rows = await db
      .select()
      .from(cookieConsentSettings)
      .where(eq(cookieConsentSettings.locale, locale));
    return c.json({ data: rows });
  });

  /** GET /logs — list consent logs (admin) */
  router.get('/logs', requireRole('admin', 'superadmin'), async (c) => {
    const rows = await db
      .select()
      .from(cookieConsentLogs)
      .orderBy(cookieConsentLogs.createdAt)
      .limit(100);
    return c.json({ data: rows });
  });

  return router;
}

// ─── Public routes (no auth) ──────────────────────────────────────────────────

export function createPublicCookieConsentRoutes(db: Database) {
  const router = new Hono();

  /** GET /config — public config for the storefront banner (locale-aware) */
  router.get('/config', async (c) => {
    const locale = c.req.query('locale');
    const categories = await db
      .select()
      .from(cookieConsentCategories)
      .where(eq(cookieConsentCategories.enabled, true))
      .orderBy(cookieConsentCategories.sortOrder);

    // Fetch settings for the requested locale
    const settingsRows = locale
      ? await db
          .select()
          .from(cookieConsentSettings)
          .where(eq(cookieConsentSettings.locale, locale))
      : await db.select().from(cookieConsentSettings);
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return c.json({ data: { categories, settings } });
  });

  /** POST /log — log a consent decision */
  router.post('/log', async (c) => {
    const body = await c.req.json();
    const data = ConsentLogSchema.parse(body);
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null;
    const userAgent = c.req.header('user-agent') ?? null;
    const [row] = await db
      .insert(cookieConsentLogs)
      .values({
        sessionId: data.sessionId ?? null,
        customerId: data.customerId ?? null,
        consent: data.consent,
        ipAddress: ip,
        userAgent,
      })
      .returning();
    return c.json({ data: row }, 201);
  });

  return router;
}
