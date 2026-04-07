import { Hono } from 'hono';
import type { Database } from '@forkcart/database';
import { requireRole } from '../../middleware/permissions';
import { exportProductsCSV, importProductsCSV } from '../../services/product-csv';

export function createProductCSVRoutes(db: Database) {
  const router = new Hono();

  /** GET /api/v1/products/csv — Export all products as CSV */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const csv = await exportProductsCSV(db);
    const date = new Date().toISOString().slice(0, 10);
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="forkcart-products-${date}.csv"`);
    return c.body(csv);
  });

  /** POST /api/v1/products/csv — Import products from CSV */
  router.post('/', requireRole('admin', 'superadmin'), async (c) => {
    const contentType = c.req.header('Content-Type') ?? '';

    let csvText: string;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return c.json({ error: { code: 'NO_FILE', message: 'No CSV file provided' } }, 400);
      }
      csvText = await file.text();
    } else {
      csvText = await c.req.text();
    }

    if (!csvText.trim()) {
      return c.json({ error: { code: 'EMPTY_FILE', message: 'CSV file is empty' } }, 400);
    }

    const result = await importProductsCSV(db, csvText);
    return c.json({ data: result });
  });

  return router;
}
