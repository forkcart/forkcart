/**
 * @fileoverview ForkCart Installer — WordPress-style setup wizard
 *
 * When ForkCart is not yet installed (no `.installed` lock-file) the
 * installer serves a browser-based wizard on port 4200 (the same port
 * the storefront will later use).  After installation it redirects
 * every request to the running storefront.
 *
 * Run with: pnpm start
 * Access at: http://localhost:4200
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Language, InstallConfig } from './types';
import { runSystemChecks, testDatabaseConnection } from './checks';
import { runInstallation, getInstallStatus, findRootDir } from './install';
import { generateHTML } from './template';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

/**
 * Lock-file guard — once ForkCart is installed, redirect every
 * request to the storefront so the wizard is never shown again.
 */
app.use('*', async (c, next) => {
  // Skip lock-file check for API routes (needed during installation)
  if (c.req.path.startsWith('/api/')) {
    return next();
  }
  try {
    const rootDir = findRootDir();
    if (existsSync(join(rootDir, '.installed'))) {
      // Read .env for port info
      let ports = 'Storefront: :4200 | Admin: :4201 | API: :4000';
      const envPath = join(rootDir, '.env');
      if (existsSync(envPath)) {
        const env = readFileSync(envPath, 'utf-8');
        const sf = env.match(/STOREFRONT_PORT=(\d+)/)?.[1] ?? '4200';
        const ad = env.match(/ADMIN_PORT=(\d+)/)?.[1] ?? '4201';
        const api = env.match(/API_PORT=(\d+)/)?.[1] ?? '4000';
        ports = `Storefront: :${sf} | Admin: :${ad} | API: :${api}`;
      }
      return c.html(
        `<html><head><style>body{font-family:system-ui;text-align:center;padding:80px;color:#1e293b}code{background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:14px}.ports{color:#10b981;font-weight:600;margin:16px 0}</style></head><body><h1>\u2705 ForkCart is installed</h1><p>Run these commands to start your shop:</p><p><code>pnpm build && pnpm start</code></p><p class="ports">${ports}</p><p style="margin-top:24px;color:#94a3b8;font-size:13px">Delete <code>.installed</code> to re-run the installer.</p></body></html>`,
      );
    }
  } catch {
    // Root dir not found yet \u2014 let the wizard handle it
  }
  return next();
});

/**
 * GET /logo — Serve the ForkCart logo
 */
app.get('/logo', (c) => {
  try {
    const logoPath = resolve(process.cwd(), '..', '..', 'brand', 'logo-green-200w.png');
    const logo = readFileSync(logoPath);
    return new Response(logo, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return c.text('Logo not found', 404);
  }
});

/**
 * GET / — Serve the installer wizard HTML
 */
app.get('/', (c) => {
  const lang = (c.req.query('lang') as Language) || 'en';
  const validLang = lang === 'de' ? 'de' : 'en';

  const html = generateHTML(validLang);
  return c.html(html);
});

/**
 * GET /api/check — Run system requirements check
 */
app.get('/api/check', async (c) => {
  const result = await runSystemChecks();
  return c.json(result);
});

/**
 * POST /api/test-db — Test database connection
 */
app.post('/api/test-db', async (c) => {
  try {
    const body = await c.req.json();
    const config = {
      host: body.host || 'localhost',
      port: body.port || 5432,
      username: body.username || 'forkcart',
      password: body.password || '',
      database: body.database || 'forkcart',
      createDatabase: body.createDatabase ?? false,
      connectionString: body.connectionString || undefined,
    };

    const result = await testDatabaseConnection(config);
    return c.json(result);
  } catch (error) {
    const err = error as Error;
    return c.json(
      {
        success: false,
        message: `Test failed: ${err.message}`,
        canConnect: false,
        databaseExists: false,
      },
      500,
    );
  }
});

/**
 * POST /api/install — Start installation process
 */
app.post('/api/install', async (c) => {
  try {
    const config = (await c.req.json()) as InstallConfig;

    // Validate required fields
    if (!config.database?.password && !config.database?.connectionString) {
      return c.json({ error: 'Database password or connection string is required' }, 400);
    }
    if (!config.admin?.email || !config.admin?.password) {
      return c.json({ error: 'Admin email and password are required' }, 400);
    }
    if (!config.admin?.shopName) {
      return c.json({ error: 'Shop name is required' }, 400);
    }

    // Run installation in background
    runInstallation(config).catch((err) => {
      console.error('Installation error:', err);
    });

    return c.json({ started: true });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /api/status — Get installation progress
 */
app.get('/api/status', (c) => {
  const status = getInstallStatus();
  return c.json(status);
});

/**
 * POST /api/handover — Shut down installer, start storefront on same port.
 * Called by the frontend after install completes. The browser already has
 * the success page loaded, so the user sees "Reloading..." while services start.
 */
app.post('/api/handover', async (c) => {
  const status = getInstallStatus();
  if (!status.completed || !status.handover) {
    return c.json({ ok: false, error: 'Installation not complete' }, 400);
  }

  const { rootDir } = status.handover;
  const envPath = join(rootDir, '.env');
  const pnpmPath = execSync('which pnpm', { encoding: 'utf-8' }).trim();

  console.log('[installer] Handover requested — starting storefront, then exiting.');

  // Spawn storefront + API + admin as detached processes
  // Load .env, but OVERRIDE storefront port with the installer's own port
  // so the storefront takes over the same URL the user is looking at.
  const installerPort = String(process.env['INSTALLER_PORT'] ?? process.env['PORT'] ?? '4200');
  const env = { ...process.env };
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && match[1] && match[2]) {
        // Strip surrounding quotes from .env values
        env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  // Key: storefront must bind to the installer's port so the URL stays the same
  env['STOREFRONT_PORT'] = installerPort;

  // Start API first
  const api = spawn(pnpmPath, ['--filter', '@forkcart/api', 'start'], {
    cwd: rootDir,
    env,
    detached: true,
    stdio: 'ignore',
  });
  api.unref();
  console.log(`[installer] API started (PID ${api.pid})`);

  // Start Admin
  const admin = spawn(pnpmPath, ['--filter', '@forkcart/admin', 'start'], {
    cwd: rootDir,
    env,
    detached: true,
    stdio: 'ignore',
  });
  admin.unref();
  console.log(`[installer] Admin started (PID ${admin.pid})`);

  // Reply first, then shut down after a small delay so the response is sent
  setTimeout(() => {
    console.log('[installer] Shutting down to free port for storefront...');
    // Start storefront (will bind to our port after we exit)
    const sf = spawn(pnpmPath, ['--filter', '@forkcart/storefront', 'start'], {
      cwd: rootDir,
      env,
      detached: true,
      stdio: 'ignore',
    });
    sf.unref();
    console.log(`[installer] Storefront started (PID ${sf.pid}) — exiting now.`);
    process.exit(0);
  }, 1000);

  return c.json({ ok: true, message: 'Starting services, installer shutting down...' });
});

// Start server — defaults to 4200 (same port the storefront will use later)
const port = parseInt(process.env['INSTALLER_PORT'] ?? process.env['PORT'] ?? '4200', 10);

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🛒 ForkCart Installer                           ║
║                                                   ║
║   Open in your browser:                           ║
║   http://localhost:${String(port).padEnd(4)}                          ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
