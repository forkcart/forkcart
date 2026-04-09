import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createUpdateRoutes } from '../updates';

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

// Mock the service modules before importing
vi.mock('../../../services/update-check', () => ({
  checkForUpdates: vi.fn(),
}));

vi.mock('../../../services/update-process', () => ({
  applyUpdate: vi.fn().mockResolvedValue(undefined),
  getUpdateStatus: vi.fn(),
  getUpdateLog: vi.fn(),
  isUpdateRunning: vi.fn(),
}));

// Import mocked modules to configure per-test
import { checkForUpdates } from '../../../services/update-check';
import {
  applyUpdate,
  getUpdateStatus,
  getUpdateLog,
  isUpdateRunning,
} from '../../../services/update-process';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const mockCheckForUpdates = vi.mocked(checkForUpdates);
const mockApplyUpdate = vi.mocked(applyUpdate);
const mockGetUpdateStatus = vi.mocked(getUpdateStatus);
const mockGetUpdateLog = vi.mocked(getUpdateLog);
const mockIsUpdateRunning = vi.mocked(isUpdateRunning);

function fakeUpdateCheckResult(overrides: Record<string, unknown> = {}) {
  return {
    currentVersion: '1.0.0',
    latestVersion: '1.1.0',
    updateAvailable: true,
    releaseNotes: 'Bug fixes and improvements',
    downloadUrl: 'https://github.com/forkcart/forkcart/releases/download/v1.1.0/release.tar.gz',
    publishedAt: '2026-03-19T12:00:00Z',
    sha256: 'abc123',
    ...overrides,
  };
}

function fakeUpdateStatus(overrides: Record<string, unknown> = {}) {
  return {
    active: false,
    version: null,
    steps: [],
    error: null,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

/**
 * Create a Hono app with update routes.
 * The `role` param simulates the authenticated user's role.
 */
function createApp(opts: { role?: string | null } = {}) {
  const app = new Hono();

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    if (opts.role) {
      c.set('user', { id: 'user-1', email: 'admin@shop.com', role: opts.role });
    }
    return next();
  });

  // Error handler
  app.onError((error, c) => {
    return c.json({ error: { message: error.message } }, 500);
  });

  app.route('/system/updates', createUpdateRoutes());
  return app;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Update Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckForUpdates.mockResolvedValue(fakeUpdateCheckResult());
    mockApplyUpdate.mockResolvedValue(undefined);
    mockGetUpdateStatus.mockReturnValue(fakeUpdateStatus());
    mockGetUpdateLog.mockReturnValue([]);
    mockIsUpdateRunning.mockReturnValue(false);
  });

  /* ---- GET /system/updates -------------------------------------- */

  describe('GET /system/updates', () => {
    it('returns update check result (admin)', async () => {
      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.updateAvailable).toBe(true);
      expect(body.data.latestVersion).toBe('1.1.0');
      expect(mockCheckForUpdates).toHaveBeenCalledWith(false);
    });

    it('returns update check result (superadmin)', async () => {
      const app = createApp({ role: 'superadmin' });
      const res = await app.request('/system/updates');

      expect(res.status).toBe(200);
    });

    it('passes force=true query param', async () => {
      const app = createApp({ role: 'admin' });
      await app.request('/system/updates?force=true');

      expect(mockCheckForUpdates).toHaveBeenCalledWith(true);
    });

    it('returns no update available', async () => {
      mockCheckForUpdates.mockResolvedValue(
        fakeUpdateCheckResult({
          updateAvailable: false,
          latestVersion: '1.0.0',
          downloadUrl: null,
        }),
      );

      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.updateAvailable).toBe(false);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp({ role: null });
      const res = await app.request('/system/updates');

      expect(res.status).toBe(401);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp({ role: 'editor' });
      const res = await app.request('/system/updates');

      expect(res.status).toBe(403);
    });
  });

  /* ---- GET /system/updates/status ------------------------------- */

  describe('GET /system/updates/status', () => {
    it('returns current status (admin)', async () => {
      mockGetUpdateStatus.mockReturnValue(
        fakeUpdateStatus({
          active: true,
          version: '1.1.0',
          startedAt: '2026-03-19T12:00:00Z',
        }),
      );

      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates/status');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.active).toBe(true);
      expect(body.data.version).toBe('1.1.0');
    });

    it('returns idle status', async () => {
      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates/status');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.active).toBe(false);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp({ role: null });
      const res = await app.request('/system/updates/status');

      expect(res.status).toBe(401);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp({ role: 'editor' });
      const res = await app.request('/system/updates/status');

      expect(res.status).toBe(403);
    });
  });

  /* ---- GET /system/updates/history ------------------------------ */

  describe('GET /system/updates/history', () => {
    it('returns update history (admin)', async () => {
      mockGetUpdateLog.mockReturnValue([
        {
          version: '1.0.0',
          timestamp: '2026-03-18T10:00:00Z',
          success: true,
          duration: 45,
        },
      ]);

      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates/history');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].version).toBe('1.0.0');
    });

    it('returns empty history', async () => {
      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates/history');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(0);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp({ role: null });
      const res = await app.request('/system/updates/history');

      expect(res.status).toBe(401);
    });
  });

  /* ---- POST /system/updates/apply ------------------------------- */

  describe('POST /system/updates/apply', () => {
    it('starts update (superadmin only)', async () => {
      const app = createApp({ role: 'superadmin' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.message).toContain('1.1.0');
      expect(body.data.version).toBe('1.1.0');
      expect(mockApplyUpdate).toHaveBeenCalledWith(
        '1.1.0',
        'https://github.com/forkcart/forkcart/releases/download/v1.1.0/release.tar.gz',
        'Bug fixes and improvements',
      );
    });

    it('returns 403 for admin (not superadmin)', async () => {
      const app = createApp({ role: 'admin' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });

      expect(res.status).toBe(403);
    });

    it('returns 401 for unauthenticated', async () => {
      const app = createApp({ role: null });
      const res = await app.request('/system/updates/apply', { method: 'POST' });

      expect(res.status).toBe(401);
    });

    it('returns 409 when update already running', async () => {
      mockIsUpdateRunning.mockReturnValue(true);

      const app = createApp({ role: 'superadmin' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error.code).toBe('UPDATE_IN_PROGRESS');
    });

    it('returns 400 when no update available', async () => {
      mockCheckForUpdates.mockResolvedValue(
        fakeUpdateCheckResult({
          updateAvailable: false,
          downloadUrl: null,
        }),
      );

      const app = createApp({ role: 'superadmin' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe('NO_UPDATE');
    });

    it('returns 400 when no download URL', async () => {
      mockCheckForUpdates.mockResolvedValue(
        fakeUpdateCheckResult({
          updateAvailable: true,
          downloadUrl: null,
        }),
      );

      const app = createApp({ role: 'superadmin' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });

      expect(res.status).toBe(400);
    });

    it('returns 403 for editor role', async () => {
      const app = createApp({ role: 'editor' });
      const res = await app.request('/system/updates/apply', { method: 'POST' });

      expect(res.status).toBe(403);
    });
  });
});
