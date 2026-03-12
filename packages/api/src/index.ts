import { serve } from '@hono/node-server';
import { createLogger } from '@forkcart/core';
import { createDatabase } from '@forkcart/database';
import { createApp } from './app.js';

const logger = createLogger('api');

const port = parseInt(process.env['API_PORT'] ?? '4000', 10);
const host = process.env['API_HOST'] ?? '0.0.0.0';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  logger.fatal('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = createDatabase(databaseUrl);
const app = createApp(db);

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  logger.info({ port: info.port, host }, 'ForkCart API server started');
});
