import { Hono } from 'hono';
import { requireRole } from '../../middleware/permissions';
import { checkForUpdates } from '../../services/update-check';
import { applyUpdate, getUpdateStatus, getUpdateLog, isUpdateRunning } from '../../services/update-process';

export function createUpdateRoutes() {
  const router = new Hono();

  /** GET /api/v1/system/updates — Check for available updates */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const force = c.req.query('force') === 'true';
    const result = await checkForUpdates(force);
    return c.json({ data: result });
  });

  /** GET /api/v1/system/updates/status — Get update progress */
  router.get('/status', requireRole('admin', 'superadmin'), async (c) => {
    const status = getUpdateStatus();
    return c.json({ data: status });
  });

  /** GET /api/v1/system/updates/history — Get update history */
  router.get('/history', requireRole('admin', 'superadmin'), async (c) => {
    const log = getUpdateLog();
    return c.json({ data: log });
  });

  /** POST /api/v1/system/updates/apply — Start the update process */
  router.post('/apply', requireRole('superadmin'), async (c) => {
    if (isUpdateRunning()) {
      return c.json(
        { error: { code: 'UPDATE_IN_PROGRESS', message: 'An update is already in progress' } },
        409,
      );
    }

    const updateInfo = await checkForUpdates(true);
    if (!updateInfo.updateAvailable || !updateInfo.downloadUrl) {
      return c.json({ error: { code: 'NO_UPDATE', message: 'No update available' } }, 400);
    }

    // Start update in background — don't block the response
    applyUpdate(updateInfo.latestVersion, updateInfo.downloadUrl).catch((err) => {
      console.error('[update] Unhandled error in update process:', err);
    });

    return c.json({
      data: {
        message: `Update to v${updateInfo.latestVersion} started`,
        version: updateInfo.latestVersion,
      },
    });
  });

  return router;
}
