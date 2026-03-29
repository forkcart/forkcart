import { Hono } from 'hono';
import { requireRole } from '../../middleware/permissions';
import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exec } from 'node:child_process';

const REBUILD_FLAG_PATH = resolve(process.cwd(), 'data', '.rebuild_needed');

/** Check if a rebuild is needed */
export function isRebuildNeeded(): boolean {
  return existsSync(REBUILD_FLAG_PATH);
}

/** Set the rebuild-needed flag with metadata */
export function setRebuildNeeded(reason: string): void {
  const data = JSON.stringify({
    reason,
    timestamp: new Date().toISOString(),
  });
  writeFileSync(REBUILD_FLAG_PATH, data, 'utf-8');
}

/** Clear the rebuild-needed flag */
export function clearRebuildNeeded(): void {
  try {
    unlinkSync(REBUILD_FLAG_PATH);
  } catch {
    // Already cleared
  }
}

/** Get rebuild flag details */
function getRebuildDetails(): { reason: string; timestamp: string } | null {
  if (!existsSync(REBUILD_FLAG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(REBUILD_FLAG_PATH, 'utf-8'));
  } catch {
    return { reason: 'unknown', timestamp: new Date().toISOString() };
  }
}

export function createSystemRoutes() {
  const router = new Hono();

  /** Check rebuild status */
  router.get('/rebuild', requireRole('admin', 'superadmin'), async (c) => {
    const needed = isRebuildNeeded();
    const details = needed ? getRebuildDetails() : null;
    return c.json({ data: { rebuildNeeded: needed, ...details } });
  });

  /** Trigger a rebuild + restart */
  router.post('/rebuild', requireRole('admin', 'superadmin'), async (c) => {
    if (!isRebuildNeeded()) {
      return c.json({ data: { message: 'No rebuild needed' } });
    }

    // Respond immediately, run rebuild in background
    const projectRoot = resolve(process.cwd(), '..');
    const cmd = [
      `cd "${projectRoot}"`,
      'rm -rf packages/admin/.next packages/storefront/.next',
      'pnpm build',
      'systemctl restart forkcart-api forkcart-admin 2>/dev/null || true',
    ].join(' && ');

    clearRebuildNeeded();

    exec(cmd, { timeout: 300000 }, (error, _stdout, stderr) => {
      if (error) {
        console.error('[system] Rebuild failed:', error.message);
        console.error('[system] stderr:', stderr);
        // Re-set the flag so user can retry
        setRebuildNeeded('Rebuild failed — retry needed');
      } else {
        console.log('[system] Rebuild completed successfully');
      }
    });

    return c.json({
      data: {
        message: 'Rebuild started in background. Services will restart when complete.',
        startedAt: new Date().toISOString(),
      },
    });
  });

  return router;
}
