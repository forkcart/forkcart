import { Hono } from 'hono';
import { requireRole } from '../../middleware/permissions';
import {
  createBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  cleanupBackups,
} from '../../services/db-backup';

export function createDbBackupRoutes() {
  const router = new Hono();

  /** GET /api/v1/system/backups — List all backups */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const backups = listBackups();
    return c.json({ data: backups });
  });

  /** POST /api/v1/system/backups — Create a new backup */
  router.post('/', requireRole('superadmin'), async (c) => {
    try {
      const backup = createBackup();
      cleanupBackups();
      return c.json({ data: backup }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: { code: 'BACKUP_FAILED', message: msg } }, 500);
    }
  });

  /** POST /api/v1/system/backups/:filename/restore — Restore a backup */
  router.post('/:filename/restore', requireRole('superadmin'), async (c) => {
    const filename = c.req.param('filename')!;
    try {
      restoreBackup(filename);
      return c.json({ data: { message: `Backup ${filename} restored successfully` } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: { code: 'RESTORE_FAILED', message: msg } }, 500);
    }
  });

  /** DELETE /api/v1/system/backups/:filename — Delete a backup */
  router.delete('/:filename', requireRole('superadmin'), async (c) => {
    const filename = c.req.param('filename')!;
    try {
      deleteBackup(filename);
      return c.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: { code: 'DELETE_FAILED', message: msg } }, 500);
    }
  });

  return router;
}
