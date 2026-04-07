import { Hono } from 'hono';
import type { Database } from '@forkcart/database';
import { requireRole } from '../../middleware/permissions';
import { exportOrdersCSV } from '../../services/order-csv';

export function createOrderCSVRoutes(db: Database) {
  const router = new Hono();

  /** GET /api/v1/orders/csv — Export all orders as CSV */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const csv = await exportOrdersCSV(db);
    const date = new Date().toISOString().slice(0, 10);
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="forkcart-orders-${date}.csv"`);
    return c.body(csv);
  });

  return router;
}
