import type { Database } from '@forkcart/database';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-migration-runner');

/** Migration definition from plugin SDK */
interface PluginMigration {
  version: string;
  description: string;
  up: (db: unknown) => Promise<void>;
  down?: (db: unknown) => Promise<void>;
}

/**
 * MigrationRunner — executes plugin database migrations.
 *
 * Tracks applied migrations in a `plugin_migrations` table.
 * Runs pending migrations in version order on plugin activation.
 */
export class MigrationRunner {
  constructor(private readonly db: Database) {}

  /**
   * Ensure the plugin_migrations tracking table exists.
   * Called once at startup.
   */
  async ensureMigrationTable(): Promise<void> {
    try {
      const { sql } = await import('drizzle-orm');
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_migrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plugin_name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(plugin_name, version)
        )
      `);
      logger.debug('Plugin migrations table ensured');
    } catch (error) {
      logger.error({ error }, 'Failed to create plugin_migrations table');
      throw error;
    }
  }

  /**
   * Get all applied migration versions for a plugin.
   */
  async getAppliedMigrations(pluginName: string): Promise<string[]> {
    try {
      const { sql } = await import('drizzle-orm');
      const rows = await this.db.execute<{ version: string }>(
        sql`SELECT version FROM plugin_migrations WHERE plugin_name = ${pluginName} ORDER BY applied_at ASC`,
      );
      return rows.map((r) => r.version);
    } catch {
      return [];
    }
  }

  /**
   * Run pending migrations for a plugin.
   * Compares defined migrations against applied ones and runs any that are missing.
   *
   * @returns Number of migrations applied
   */
  async runPendingMigrations(
    pluginName: string,
    migrations: PluginMigration[],
    scopedDb: unknown,
  ): Promise<number> {
    if (!migrations || migrations.length === 0) return 0;

    await this.ensureMigrationTable();

    const applied = new Set(await this.getAppliedMigrations(pluginName));

    // Sort migrations by version (semver-like string comparison)
    const sorted = [...migrations].sort((a, b) => a.version.localeCompare(b.version));

    let count = 0;
    for (const migration of sorted) {
      if (applied.has(migration.version)) continue;

      logger.info(
        { pluginName, version: migration.version, description: migration.description },
        'Running plugin migration',
      );

      try {
        // Run the migration's up function with the scoped DB
        await migration.up(scopedDb);

        // Record the migration as applied
        const { sql } = await import('drizzle-orm');
        await this.db.execute(
          sql`INSERT INTO plugin_migrations (plugin_name, version, description) VALUES (${pluginName}, ${migration.version}, ${migration.description})`,
        );

        count++;
        logger.info(
          { pluginName, version: migration.version },
          'Plugin migration applied successfully',
        );
      } catch (error) {
        logger.error({ pluginName, version: migration.version, error }, 'Plugin migration failed');
        throw new Error(
          `Migration ${migration.version} for plugin '${pluginName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    if (count > 0) {
      logger.info({ pluginName, migrationsApplied: count }, 'Plugin migrations complete');
    }

    return count;
  }

  /**
   * Rollback a specific migration version for a plugin.
   */
  async rollbackMigration(
    pluginName: string,
    migration: PluginMigration,
    scopedDb: unknown,
  ): Promise<void> {
    if (!migration.down) {
      throw new Error(
        `Migration ${migration.version} for plugin '${pluginName}' has no rollback (down) function`,
      );
    }

    logger.info({ pluginName, version: migration.version }, 'Rolling back plugin migration');

    await migration.down(scopedDb);

    const { sql } = await import('drizzle-orm');
    await this.db.execute(
      sql`DELETE FROM plugin_migrations WHERE plugin_name = ${pluginName} AND version = ${migration.version}`,
    );

    logger.info({ pluginName, version: migration.version }, 'Plugin migration rolled back');
  }
}
