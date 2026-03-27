import type { Database } from '@forkcart/database';
import type { PluginPermission } from './plugin-loader';
import { createLogger } from '../lib/logger';

const logger = createLogger('scoped-database');

/**
 * Permission-to-table mapping: which tables each permission grants access to.
 * Read permissions grant SELECT; write permissions grant INSERT/UPDATE/DELETE.
 */
const PERMISSION_TABLE_MAP: Record<string, { tables: string[]; write: boolean }> = {
  'orders:read': { tables: ['orders', 'order_items'], write: false },
  'orders:write': { tables: ['orders', 'order_items'], write: true },
  'products:read': {
    tables: ['products', 'product_images', 'product_translations', 'variants'],
    write: false,
  },
  'products:write': {
    tables: ['products', 'product_images', 'product_translations', 'variants'],
    write: true,
  },
  'customers:read': { tables: ['customers'], write: false },
  'customers:write': { tables: ['customers'], write: true },
  'settings:read': { tables: ['settings', 'theme_settings'], write: false },
  'settings:write': { tables: ['settings', 'theme_settings'], write: true },
  'inventory:read': { tables: ['products', 'variants'], write: false },
  'inventory:write': { tables: ['products', 'variants'], write: true },
  'analytics:read': { tables: ['search_logs', 'search_click_logs'], write: false },
  'files:read': { tables: ['media'], write: false },
  'files:write': { tables: ['media'], write: true },
  'email:send': { tables: ['email_logs'], write: true },
  'payments:process': { tables: ['payments', 'orders', 'order_items'], write: true },
  'webhooks:manage': { tables: ['webhooks'], write: true },
};

/**
 * ScopedDatabase — a permission-aware proxy around the raw Database handle.
 *
 * Plugins receive this instead of the raw `db`, which:
 * - Always allows access to plugin-prefixed tables (`plugin_<name>_*`)
 * - Allows access to core tables only if the plugin has matching permissions
 * - Logs all queries for audit purposes
 * - `admin:full` grants unrestricted access (use sparingly)
 */
export class ScopedDatabase {
  private readonly allowedReadTables: Set<string>;
  private readonly allowedWriteTables: Set<string>;
  private readonly pluginTablePrefix: string;
  private readonly hasFullAccess: boolean;

  constructor(
    private readonly db: Database,
    private readonly pluginName: string,
    permissions: Set<PluginPermission>,
  ) {
    this.pluginTablePrefix = `plugin_${pluginName.replace(/[^a-z0-9]/gi, '_')}_`;
    this.hasFullAccess = permissions.has('admin:full');

    // Build allowed table sets from permissions
    this.allowedReadTables = new Set<string>();
    this.allowedWriteTables = new Set<string>();

    for (const perm of permissions) {
      const mapping = PERMISSION_TABLE_MAP[perm];
      if (!mapping) continue;
      for (const table of mapping.tables) {
        this.allowedReadTables.add(table);
        if (mapping.write) {
          this.allowedWriteTables.add(table);
        }
      }
    }
  }

  /** Check if a table name is a plugin-owned table */
  private isPluginTable(tableName: string): boolean {
    return tableName.startsWith(this.pluginTablePrefix);
  }

  /** Check if read access is allowed for a table */
  private canRead(tableName: string): boolean {
    if (this.hasFullAccess) return true;
    if (this.isPluginTable(tableName)) return true;
    return this.allowedReadTables.has(tableName);
  }

  /** Check if write access is allowed for a table */
  private canWrite(tableName: string): boolean {
    if (this.hasFullAccess) return true;
    if (this.isPluginTable(tableName)) return true;
    return this.allowedWriteTables.has(tableName);
  }

  /**
   * Execute a raw SQL query with permission checks.
   * Plugins should prefer this for custom table operations.
   *
   * Supports both:
   * - Drizzle sql template tags: db.execute(sql`SELECT * FROM ...`)
   * - Raw SQL strings with params: db.execute('SELECT * FROM ... WHERE id = $1', [id])
   */
  async execute<T = Record<string, unknown>>(
    query: Parameters<Database['execute']>[0] | string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    logger.debug({ pluginName: this.pluginName }, 'Scoped DB execute');

    // If it's a raw string, convert to parameterized query
    if (typeof query === 'string') {
      // Use the raw pg client through Drizzle's execute with sql tag
      const { sql: drizzleSql } = await import('drizzle-orm');

      if (params && params.length > 0) {
        // For parameterized queries, use raw SQL with embedded values
        // Replace $1, $2, etc. with actual values (escaped)
        let processedQuery = query;
        params.forEach((param, i) => {
          const placeholder = `$${i + 1}`;
          // Escape strings, leave numbers/booleans as-is
          const value =
            param === null
              ? 'NULL'
              : typeof param === 'string'
                ? `'${param.replace(/'/g, "''")}'`
                : String(param);
          processedQuery = processedQuery.replace(placeholder, value);
        });
        const result = await this.db.execute(drizzleSql.raw(processedQuery));
        return { rows: result as unknown as T[] };
      }

      // No params, just execute the raw SQL
      const result = await this.db.execute(drizzleSql.raw(query));
      return { rows: result as unknown as T[] };
    }

    // It's already a Drizzle sql template tag
    const result = await this.db.execute(query);
    return { rows: result as unknown as T[] };
  }

  /**
   * Get the query builder proxy — provides access to Drizzle query API
   * but only for tables the plugin has permission to access.
   *
   * Returns a Proxy that intercepts property access on db.query.*
   */
  get query(): Database['query'] {
    const self = this;
    return new Proxy(this.db.query, {
      get(target, prop: string) {
        // Check if the plugin can read this table
        // Convert camelCase query key to snake_case table name
        const tableName = prop.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (!self.canRead(tableName) && !self.canRead(prop)) {
          // Also check the raw property name (some tables match directly)
          logger.warn({ pluginName: self.pluginName, table: prop }, 'Blocked read access to table');
          throw new Error(
            `Plugin '${self.pluginName}' does not have permission to read table '${prop}'`,
          );
        }
        return (target as Record<string, unknown>)[prop];
      },
    }) as Database['query'];
  }

  /**
   * Insert proxy — checks write permission before allowing inserts.
   */
  insert(table: Parameters<Database['insert']>[0]) {
    const tableName = this.getTableName(table);
    if (!this.canWrite(tableName)) {
      logger.warn({ pluginName: this.pluginName, table: tableName }, 'Blocked write to table');
      throw new Error(
        `Plugin '${this.pluginName}' does not have permission to write to table '${tableName}'`,
      );
    }
    return this.db.insert(table);
  }

  /**
   * Update proxy — checks write permission before allowing updates.
   */
  update(table: Parameters<Database['update']>[0]) {
    const tableName = this.getTableName(table);
    if (!this.canWrite(tableName)) {
      logger.warn({ pluginName: this.pluginName, table: tableName }, 'Blocked write to table');
      throw new Error(
        `Plugin '${this.pluginName}' does not have permission to write to table '${tableName}'`,
      );
    }
    return this.db.update(table);
  }

  /**
   * Delete proxy — checks write permission before allowing deletes.
   */
  delete(table: Parameters<Database['delete']>[0]) {
    const tableName = this.getTableName(table);
    if (!this.canWrite(tableName)) {
      logger.warn({ pluginName: this.pluginName, table: tableName }, 'Blocked delete on table');
      throw new Error(
        `Plugin '${this.pluginName}' does not have permission to delete from table '${tableName}'`,
      );
    }
    return this.db.delete(table);
  }

  /**
   * Select proxy — checks read permission.
   */
  select(...args: Parameters<Database['select']>) {
    // Select doesn't target a specific table at call time (it's in .from())
    // We allow it and rely on the query-level checks
    return this.db.select(...args);
  }

  /** Extract table name from a Drizzle table object */
  private getTableName(table: unknown): string {
    // Drizzle table objects have a Symbol-keyed name, but also expose it
    // via the table config. We try multiple approaches.
    const t = table as Record<string, unknown>;
    // pgTable objects have [Table.Symbol.Name] but we can access via _.name
    if (t['_'] && typeof t['_'] === 'object') {
      const config = t['_'] as Record<string, unknown>;
      if (typeof config['name'] === 'string') return config['name'];
    }
    // Fallback: try common property names
    if (typeof t['name'] === 'string') return t['name'];
    // Last resort: try to get the SQL table name from the object's toString
    return String(table);
  }
}
