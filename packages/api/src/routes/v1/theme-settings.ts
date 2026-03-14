import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@forkcart/database';
import { themeSettings, eq } from '@forkcart/database';
import { requireRole } from '../../middleware/permissions';

const UpdateThemeSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
  }),
);

/** Default theme settings for reset */
const DEFAULTS: Record<string, string> = {
  primary: '#1f2937',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  background: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  baseFontSize: '16',
  headingWeight: '700',
  bodyWeight: '400',
  borderRadius: '8',
  containerMaxWidth: '1280',
  sectionSpacing: '64',
  buttonRadius: '8',
  buttonPaddingX: '24',
  buttonPaddingY: '12',
};

/** Theme settings routes — public GET, admin PUT/POST */
export function createThemeSettingsRoutes(db: Database) {
  const router = new Hono();

  /** GET / — public, returns all theme settings */
  router.get('/', async (c) => {
    const rows = await db.select().from(themeSettings).orderBy(themeSettings.sortOrder);
    return c.json({ data: rows });
  });

  /** PUT / — admin only, bulk update settings */
  router.put('/', requireRole('admin', 'superadmin'), async (c) => {
    const body = await c.req.json();
    const updates = UpdateThemeSchema.parse(body);

    const now = new Date();
    for (const { key, value } of updates) {
      await db
        .update(themeSettings)
        .set({ value, updatedAt: now })
        .where(eq(themeSettings.key, key));
    }

    const rows = await db.select().from(themeSettings).orderBy(themeSettings.sortOrder);
    return c.json({ data: rows });
  });

  /** POST /reset — admin only, reset all to defaults */
  router.post('/reset', requireRole('admin', 'superadmin'), async (c) => {
    const now = new Date();
    for (const [key, value] of Object.entries(DEFAULTS)) {
      await db
        .update(themeSettings)
        .set({ value, updatedAt: now })
        .where(eq(themeSettings.key, key));
    }

    const rows = await db.select().from(themeSettings).orderBy(themeSettings.sortOrder);
    return c.json({ data: rows });
  });

  return router;
}
