/**
 * @fileoverview ForkCart Installer - WordPress-style setup wizard
 *
 * A browser-based setup wizard that configures a fresh ForkCart installation.
 * Run with: pnpm start
 * Access at: http://localhost:3333
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Language, InstallConfig } from './types';
import { runSystemChecks, testDatabaseConnection } from './checks';
import { runInstallation, getInstallStatus } from './install';
import { generateHTML } from './template';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

/**
 * GET /logo - Serve the ForkCart logo
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
 * GET / - Serve the installer wizard HTML
 */
app.get('/', (c) => {
  const lang = (c.req.query('lang') as Language) || 'en';
  const validLang = lang === 'de' ? 'de' : 'en';

  const html = generateHTML(validLang);
  return c.html(html);
});

/**
 * GET /api/check - Run system requirements check
 */
app.get('/api/check', async (c) => {
  const result = await runSystemChecks();
  return c.json(result);
});

/**
 * POST /api/test-db - Test database connection
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
 * POST /api/install - Start installation process
 */
app.post('/api/install', async (c) => {
  try {
    const config = (await c.req.json()) as InstallConfig;

    // Validate required fields
    if (!config.database?.password) {
      return c.json({ error: 'Database password is required' }, 400);
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
 * GET /api/status - Get installation progress
 */
app.get('/api/status', (c) => {
  const status = getInstallStatus();
  return c.json(status);
});

// Start server
const port = parseInt(process.env['INSTALLER_PORT'] ?? '3333', 10);

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🛒 ForkCart Installer                           ║
║                                                   ║
║   Open in your browser:                           ║
║   http://localhost:${port}                           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
