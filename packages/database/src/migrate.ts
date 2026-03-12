import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './connection';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = createDatabase(connectionString);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './src/migrations' });
console.log('Migrations complete.');

process.exit(0);
