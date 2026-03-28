#!/usr/bin/env tsx
/**
 * Sync Core Schema — generates the coreSchema map from Drizzle table definitions.
 *
 * Usage: pnpm schema:sync
 *
 * Reads packages/database/src/schemas/*.ts and outputs
 * the schema map to packages/plugin-sdk/src/schema.ts.
 *
 * This ensures plugin-sdk's coreSchema stays in sync with actual DB definitions.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCHEMAS_DIR = join(__dirname, '../packages/database/src/schemas');
const OUTPUT_FILE = join(__dirname, '../packages/plugin-sdk/src/schema.ts');

// Parse Drizzle column types from source files
const DRIZZLE_TYPE_MAP: Record<string, string> = {
  uuid: 'UUID',
  varchar: 'VARCHAR', // length extracted separately
  text: 'TEXT',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMPTZ',
  jsonb: 'JSONB',
  serial: 'SERIAL',
  bigint: 'BIGINT',
  real: 'REAL',
  doublePrecision: 'DOUBLE PRECISION',
  numeric: 'NUMERIC',
  date: 'DATE',
  time: 'TIME',
};

interface ParsedColumn {
  name: string;
  sqlType: string;
  nullable: boolean;
  primaryKey: boolean;
}

function parseSchemaFile(filePath: string): Record<string, ParsedColumn[]> {
  const content = readFileSync(filePath, 'utf-8');
  const tables: Record<string, ParsedColumn[]> = {};

  // Match pgTable('table_name', { ... })
  const tableRegex = /pgTable\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*[,)]/g;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const tableName = tableMatch[1];
    const columnsBlock = tableMatch[2];
    const columns: ParsedColumn[] = [];

    // Match column definitions: columnName: type('db_name'[, options])
    const colRegex = /(\w+):\s*(\w+)\(['"](\w+)['"](?:,\s*\{[^}]*length:\s*(\d+)[^}]*\})?\)/g;
    let colMatch;

    while ((colMatch = colRegex.exec(columnsBlock)) !== null) {
      const _propName = colMatch[1];
      const drizzleType = colMatch[2];
      const dbName = colMatch[3];
      const length = colMatch[4];

      let sqlType = DRIZZLE_TYPE_MAP[drizzleType] || drizzleType.toUpperCase();
      if (sqlType === 'VARCHAR' && length) {
        sqlType = `VARCHAR(${length})`;
      }

      // Check for .notNull() and .primaryKey()
      const afterCol = columnsBlock.substring(
        colMatch.index + colMatch[0].length,
        colMatch.index + colMatch[0].length + 200,
      );
      const nullable = !afterCol.match(/^[^,}]*\.notNull\(/);
      const primaryKey = !!afterCol.match(/^[^,}]*\.primaryKey\(/);

      columns.push({ name: dbName, sqlType, nullable, primaryKey });
    }

    if (columns.length > 0) {
      tables[tableName] = columns;
    }
  }

  return tables;
}

// Main
const schemaFiles = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

const allTables: Record<string, ParsedColumn[]> = {};
for (const file of schemaFiles) {
  const tables = parseSchemaFile(join(SCHEMAS_DIR, file));
  Object.assign(allTables, tables);
}

console.log(
  `Parsed ${Object.keys(allTables).length} tables from ${schemaFiles.length} schema files`,
);
for (const [name, cols] of Object.entries(allTables)) {
  console.log(`  ${name}: ${cols.length} columns`);
}

// Generate the coreSchema object
const schemaEntries = Object.entries(allTables)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([tableName, columns]) => {
    const colEntries = columns
      .map((c) => {
        const pk = c.primaryKey ? ', primaryKey: true' : '';
        return `    ${c.name}: { sqlType: '${c.sqlType}', nullable: ${c.nullable}${pk} },`;
      })
      .join('\n');
    return `  ${tableName}: {\n${colEntries}\n  },`;
  })
  .join('\n\n');

console.log(`\nGenerated coreSchema with ${Object.keys(allTables).length} tables.`);
console.log('To apply: manually update packages/plugin-sdk/src/schema.ts with the output above.');
console.log('\n--- coreSchema output ---\n');
console.log(`export const coreSchema: CoreSchema = {\n${schemaEntries}\n};`);
