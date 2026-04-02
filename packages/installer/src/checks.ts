/**
 * @fileoverview System requirement checks for the installer
 */

import { execSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
import postgres from 'postgres';
import type {
  SystemCheckResult,
  SystemCheckItem,
  DatabaseConfig,
  DatabaseTestResult,
} from './types';

/**
 * Check if Node.js version is >= 22
 */
function checkNodeVersion(): SystemCheckItem {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10);
  const passed = major >= 22;

  return {
    name: 'nodeVersion',
    passed,
    message: passed ? `Node.js ${version} ✓` : `Node.js ${version} (requires ≥ 22)`,
    required: true,
  };
}

/**
 * Check if PostgreSQL is reachable (basic check via psql or connection)
 */
async function checkPostgreSQL(): Promise<SystemCheckItem> {
  try {
    // Try to check if psql is available
    execSync('which psql', { stdio: 'pipe' });
    return {
      name: 'postgresql',
      passed: true,
      message: 'PostgreSQL client available ✓',
      required: true,
    };
  } catch {
    // psql not found, but PostgreSQL might still be accessible via TCP
    return {
      name: 'postgresql',
      passed: true,
      message: 'PostgreSQL (will test in database step)',
      required: true,
    };
  }
}

/**
 * Check if disk space is > 1GB
 */
function checkDiskSpace(): SystemCheckItem {
  try {
    const stats = statfsSync('/');
    const freeBytes = stats.bavail * stats.bsize;
    const freeGB = freeBytes / (1024 * 1024 * 1024);
    const passed = freeGB > 1;

    return {
      name: 'diskSpace',
      passed,
      message: passed
        ? `${freeGB.toFixed(1)} GB available ✓`
        : `${freeGB.toFixed(1)} GB available (requires > 1GB)`,
      required: true,
    };
  } catch {
    return {
      name: 'diskSpace',
      passed: false,
      message: 'Unable to check disk space',
      required: true,
    };
  }
}

/**
 * Check if pnpm is installed
 */
function checkPnpm(): SystemCheckItem {
  try {
    const version = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    return {
      name: 'pnpm',
      passed: true,
      message: `pnpm ${version} ✓`,
      required: true,
    };
  } catch {
    return {
      name: 'pnpm',
      passed: false,
      message: 'pnpm not found',
      required: true,
    };
  }
}

/**
 * Run all system checks
 */
export async function runSystemChecks(): Promise<SystemCheckResult> {
  const nodeVersion = checkNodeVersion();
  const postgresql = await checkPostgreSQL();
  const diskSpace = checkDiskSpace();
  const pnpm = checkPnpm();

  const allPassed = nodeVersion.passed && postgresql.passed && diskSpace.passed && pnpm.passed;

  return {
    nodeVersion,
    postgresql,
    diskSpace,
    pnpm,
    allPassed,
  };
}

/**
 * Build connection string from database config
 */
export function buildConnectionString(config: DatabaseConfig): string {
  if (config.connectionString) return config.connectionString;
  const { host, port, username, password, database } = config;
  const encodedPassword = encodeURIComponent(password);
  return `postgres://${username}:${encodedPassword}@${host}:${port}/${database}`;
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(config: DatabaseConfig): Promise<DatabaseTestResult> {
  const { host, port, username, password, database, createDatabase } = config;

  // First, try connecting to the specific database
  try {
    const connStr = config.connectionString
      ? config.connectionString
      : `postgres://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    const sql = postgres(connStr, { max: 1, connect_timeout: 5 });
    await sql`SELECT 1`;
    await sql.end();

    return {
      success: true,
      message: 'Connection successful',
      canConnect: true,
      databaseExists: true,
    };
  } catch (error) {
    const err = error as Error;
    const isDbNotExist = err.message.includes('does not exist');

    // If database doesn't exist, check if we can connect to postgres db
    if (isDbNotExist && !config.connectionString) {
      try {
        const connStr = `postgres://${username}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
        const sql = postgres(connStr, { max: 1, connect_timeout: 5 });
        await sql`SELECT 1`;
        await sql.end();

        if (createDatabase) {
          return {
            success: true,
            message: `Database "${database}" will be created during installation`,
            canConnect: true,
            databaseExists: false,
          };
        }

        return {
          success: false,
          message: `Database "${database}" does not exist. Enable "Create database" option.`,
          canConnect: true,
          databaseExists: false,
        };
      } catch (e) {
        const connErr = e as Error;
        return {
          success: false,
          message: `Cannot connect to PostgreSQL: ${connErr.message}`,
          canConnect: false,
          databaseExists: false,
        };
      }
    }

    return {
      success: false,
      message: `Connection failed: ${err.message}`,
      canConnect: false,
      databaseExists: false,
    };
  }
}

/**
 * Create database if it doesn't exist
 */
export async function createDatabaseIfNotExists(config: DatabaseConfig): Promise<void> {
  const { host, port, username, password, database } = config;
  const encodedPassword = encodeURIComponent(password);
  const connStr = `postgres://${username}:${encodedPassword}@${host}:${port}/postgres`;

  const sql = postgres(connStr, { max: 1 });

  // Check if database exists
  const result = await sql`
    SELECT 1 FROM pg_database WHERE datname = ${database}
  `;

  if (result.length === 0) {
    // Create the database (need to use unsafe for CREATE DATABASE)
    await sql.unsafe(`CREATE DATABASE "${database}"`);
  }

  await sql.end();
}
