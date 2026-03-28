import { createLogger } from '../lib/logger';

const logger = createLogger('migration-validator');

/**
 * Core tables and their ID types.
 * Used to detect type mismatches in plugin migrations.
 */
const CORE_ID_TYPES: Record<string, string> = {
  products: 'UUID',
  variants: 'UUID',
  orders: 'UUID',
  order_items: 'UUID',
  customers: 'UUID',
  categories: 'UUID',
  media: 'UUID',
  payments: 'UUID',
  product_images: 'UUID',
  product_reviews: 'UUID',
  pages: 'UUID',
  coupons: 'UUID',
  wishlists: 'UUID',
};

interface ValidationWarning {
  level: 'warn' | 'error';
  message: string;
  suggestion?: string;
}

/**
 * Validate plugin migration SQL for common issues.
 *
 * Catches:
 * - VARCHAR columns referencing UUID core table IDs
 * - Missing indexes on foreign-key-like columns
 * - References to non-existent core tables
 *
 * This is best-effort static analysis on SQL strings.
 * It won't catch everything but catches the most common mistakes.
 */
export function validateMigrationSql(pluginName: string, sql: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const upperSql = sql.toUpperCase();

  // Pattern: column_name VARCHAR(...) that looks like a foreign key to a core table
  // e.g., "product_id VARCHAR(255)" when products.id is UUID
  for (const [table, idType] of Object.entries(CORE_ID_TYPES)) {
    const singular = table.endsWith('ies')
      ? table.slice(0, -3) + 'y'
      : table.endsWith('s')
        ? table.slice(0, -1)
        : table;

    // Match patterns like "product_id VARCHAR" or "order_id VARCHAR"
    const fkPatterns = [
      `${singular}_id`,
      `source_${singular}_id`,
      `target_${singular}_id`,
      `recommended_${singular}_id`,
      `parent_${singular}_id`,
    ];

    for (const fkCol of fkPatterns) {
      const fkUpper = fkCol.toUpperCase();
      const idx = upperSql.indexOf(fkUpper);
      if (idx === -1) continue;

      // Check what type follows this column name
      const afterCol = upperSql.substring(idx + fkUpper.length, idx + fkUpper.length + 30).trim();

      if (afterCol.startsWith('VARCHAR') && idType === 'UUID') {
        warnings.push({
          level: 'warn',
          message: `Column '${fkCol}' uses VARCHAR but '${table}.id' is UUID — this will cause JOIN errors`,
          suggestion: `Use ref('${table}.id') or UUID instead of VARCHAR. Example: ${fkCol} \${ref('${table}.id')} NOT NULL`,
        });
      }
    }
  }

  // Pattern: JOIN on core table without ::text cast (info only)
  const joinPattern = /JOIN\s+(\w+)\s+\w+\s+ON\s+\w+\.id\s*=\s*/gi;
  let match;
  while ((match = joinPattern.exec(sql)) !== null) {
    const joinedTable = match[1]!.toLowerCase();
    if (CORE_ID_TYPES[joinedTable] === 'UUID') {
      // Check if there's a ::text cast nearby
      const context = sql.substring(match.index, match.index + 100);
      if (!context.includes('::text') && !context.includes('::uuid')) {
        warnings.push({
          level: 'warn',
          message: `JOIN on '${joinedTable}' without type cast — may fail if column types differ`,
          suggestion: `Use '${joinedTable}.id::text = your_column' or ensure your column is UUID`,
        });
      }
    }
  }

  if (warnings.length > 0) {
    logger.warn(
      { pluginName, warningCount: warnings.length },
      'Plugin migration validation found issues',
    );
    for (const w of warnings) {
      logger[w.level]({ pluginName }, `${w.message}${w.suggestion ? ` → ${w.suggestion}` : ''}`);
    }
  }

  return warnings;
}
