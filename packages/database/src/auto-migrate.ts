import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import type { Database } from './connection';

/**
 * Run all pending Drizzle migrations automatically.
 * Safe to call on every startup — already-applied migrations are skipped.
 * Uses Drizzle's built-in `__drizzle_migrations` tracking table.
 *
 * Searches upward from this file to find the migrations folder,
 * works with both tsx (source) and compiled dist.
 */
export async function runMigrations(db: Database): Promise<void> {
  // Walk up from this file's directory to find src/migrations/meta/_journal.json
  let dir = path.dirname(fileURLToPath(import.meta.url));
  let migrationsFolder = '';

  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'migrations');
    if (fs.existsSync(path.join(candidate, 'meta', '_journal.json'))) {
      migrationsFolder = candidate;
      break;
    }
    // Also check src/migrations from package root
    const srcCandidate = path.join(dir, 'src', 'migrations');
    if (fs.existsSync(path.join(srcCandidate, 'meta', '_journal.json'))) {
      migrationsFolder = srcCandidate;
      break;
    }
    dir = path.dirname(dir);
  }

  if (!migrationsFolder) {
    throw new Error('Could not find migrations folder with meta/_journal.json');
  }

  await migrate(db, { migrationsFolder });
}
