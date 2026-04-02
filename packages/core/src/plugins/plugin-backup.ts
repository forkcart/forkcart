/**
 * Plugin Backup & Rollback Utilities
 *
 * Provides backup/restore functionality for plugins during updates:
 * - Creates backups before plugin updates
 * - Auto-cleanup to keep only the last N backups
 * - Restore from backup for rollback
 *
 * @module plugin-backup
 */

import { cp, rm, readdir, mkdir, stat, access, constants } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-backup');

/** Default number of backups to keep per plugin */
const DEFAULT_MAX_BACKUPS = 3;

/** Backup directory relative to cwd */
const BACKUP_DIR = 'data/plugins/.backup';

/**
 * Backup metadata stored with each backup
 */
export interface BackupMeta {
  slug: string;
  version: string;
  createdAt: string;
  sourcePath: string;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  backupPath?: string;
  version?: string;
  error?: string;
}

/**
 * Result of a restore/rollback operation
 */
export interface RestoreResult {
  success: boolean;
  restoredVersion?: string;
  error?: string;
}

/**
 * Info about an available backup
 */
export interface BackupInfo {
  version: string;
  backupPath: string;
  createdAt: Date;
}

/**
 * Creates the backup directory structure if it doesn't exist.
 *
 * @param slug - The plugin slug
 * @returns The full path to the plugin's backup directory
 */
async function ensureBackupDir(slug: string): Promise<string> {
  const backupDir = resolve(process.cwd(), BACKUP_DIR, slug);
  await mkdir(backupDir, { recursive: true });
  return backupDir;
}

/**
 * Checks if a directory exists.
 *
 * @param dirPath - Path to check
 * @returns True if directory exists
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath, constants.F_OK);
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Creates a backup of a plugin before updating.
 *
 * Copies the entire plugin directory to:
 * `data/plugins/.backup/<slug>/<version>/`
 *
 * @param slug - The plugin slug
 * @param version - The current version being backed up
 * @param pluginDir - The source plugin directory path
 * @returns BackupResult with success status and backup path
 *
 * @example
 * ```ts
 * const result = await createPluginBackup('stripe', '1.0.0', '/path/to/plugin');
 * if (result.success) {
 *   console.log(`Backup created at ${result.backupPath}`);
 * }
 * ```
 */
export async function createPluginBackup(
  slug: string,
  version: string,
  pluginDir: string,
): Promise<BackupResult> {
  try {
    // Verify source exists
    if (!(await dirExists(pluginDir))) {
      logger.warn({ slug, pluginDir }, 'Plugin directory not found, skipping backup');
      return { success: false, error: 'Plugin directory not found' };
    }

    // Create backup directory
    const backupBaseDir = await ensureBackupDir(slug);
    const backupPath = join(backupBaseDir, version);

    // Check if this version already backed up
    if (await dirExists(backupPath)) {
      logger.debug({ slug, version }, 'Backup already exists for this version');
      return { success: true, backupPath, version };
    }

    // Copy plugin directory to backup location
    await cp(pluginDir, backupPath, { recursive: true });

    logger.info({ slug, version, backupPath }, 'Plugin backup created');
    return { success: true, backupPath, version };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ slug, version, error: errorMsg }, 'Failed to create plugin backup');
    // Return success: false but don't throw - backup is optional safety net
    return { success: false, error: errorMsg };
  }
}

/**
 * Restores a plugin from a backup.
 *
 * Copies the backup back to the plugin directory, replacing the current version.
 *
 * @param slug - The plugin slug
 * @param version - The version to restore (or undefined for latest backup)
 * @param pluginDir - The target plugin directory path
 * @returns RestoreResult with success status and restored version
 *
 * @example
 * ```ts
 * // Restore specific version
 * const result = await restorePluginBackup('stripe', '1.0.0', '/path/to/plugin');
 *
 * // Restore latest backup
 * const result = await restorePluginBackup('stripe', undefined, '/path/to/plugin');
 * ```
 */
export async function restorePluginBackup(
  slug: string,
  version: string | undefined,
  pluginDir: string,
): Promise<RestoreResult> {
  try {
    const backupBaseDir = resolve(process.cwd(), BACKUP_DIR, slug);

    // Check if backup directory exists
    if (!(await dirExists(backupBaseDir))) {
      return { success: false, error: 'No backups found for this plugin' };
    }

    // If no version specified, find the latest backup
    let targetVersion = version;
    if (!targetVersion) {
      const backups = await listPluginBackups(slug);
      if (backups.length === 0) {
        return { success: false, error: 'No backups available' };
      }
      // Get the most recent backup
      targetVersion = backups[0]?.version;
      if (!targetVersion) {
        return { success: false, error: 'No backups available' };
      }
    }

    const backupPath = join(backupBaseDir, targetVersion);

    // Verify backup exists
    if (!(await dirExists(backupPath))) {
      return { success: false, error: `Backup for version ${targetVersion} not found` };
    }

    // Remove current plugin directory
    try {
      await rm(pluginDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, that's OK
    }

    // Restore from backup
    await mkdir(pluginDir, { recursive: true });
    await cp(backupPath, pluginDir, { recursive: true });

    logger.info({ slug, version: targetVersion, pluginDir }, 'Plugin restored from backup');
    return { success: true, restoredVersion: targetVersion };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ slug, version, error: errorMsg }, 'Failed to restore plugin from backup');
    return { success: false, error: errorMsg };
  }
}

/**
 * Lists all available backups for a plugin, sorted by creation date (newest first).
 *
 * @param slug - The plugin slug
 * @returns Array of BackupInfo objects
 *
 * @example
 * ```ts
 * const backups = await listPluginBackups('stripe');
 * // [{ version: '1.1.0', backupPath: '...', createdAt: Date }, ...]
 * ```
 */
export async function listPluginBackups(slug: string): Promise<BackupInfo[]> {
  try {
    const backupBaseDir = resolve(process.cwd(), BACKUP_DIR, slug);

    if (!(await dirExists(backupBaseDir))) {
      return [];
    }

    const entries = await readdir(backupBaseDir, { withFileTypes: true });
    const backups: BackupInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const backupPath = join(backupBaseDir, entry.name);
      try {
        const stats = await stat(backupPath);
        backups.push({
          version: entry.name,
          backupPath,
          createdAt: stats.birthtime,
        });
      } catch {
        // Skip if we can't stat the directory
      }
    }

    // Sort by creation date, newest first
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  } catch (error) {
    logger.error({ slug, error }, 'Failed to list plugin backups');
    return [];
  }
}

/**
 * Cleans up old backups, keeping only the most recent N versions.
 *
 * @param slug - The plugin slug
 * @param maxBackups - Maximum number of backups to keep (default: 3)
 * @returns Number of backups deleted
 *
 * @example
 * ```ts
 * const deleted = await cleanupOldBackups('stripe', 3);
 * console.log(`Deleted ${deleted} old backups`);
 * ```
 */
export async function cleanupOldBackups(
  slug: string,
  maxBackups: number = DEFAULT_MAX_BACKUPS,
): Promise<number> {
  try {
    const backups = await listPluginBackups(slug);

    if (backups.length <= maxBackups) {
      return 0;
    }

    // Delete backups beyond the limit (they're already sorted newest first)
    const toDelete = backups.slice(maxBackups);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        await rm(backup.backupPath, { recursive: true, force: true });
        deletedCount++;
        logger.debug({ slug, version: backup.version }, 'Deleted old plugin backup');
      } catch (error) {
        logger.warn({ slug, version: backup.version, error }, 'Failed to delete old backup');
      }
    }

    if (deletedCount > 0) {
      logger.info({ slug, deletedCount }, 'Cleaned up old plugin backups');
    }

    return deletedCount;
  } catch (error) {
    logger.error({ slug, error }, 'Failed to cleanup old backups');
    return 0;
  }
}

/**
 * Gets the current installed version of a plugin by reading its package.json.
 *
 * @param pluginDir - The plugin directory path
 * @returns The version string or null if not found
 */
export async function getPluginVersion(pluginDir: string): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const pkgJsonPath = join(pluginDir, 'package.json');
    const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as { version?: string };
    return pkgJson.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Checks if a backup exists for a specific version.
 *
 * @param slug - The plugin slug
 * @param version - The version to check
 * @returns True if backup exists
 */
export async function backupExists(slug: string, version: string): Promise<boolean> {
  const backupPath = resolve(process.cwd(), BACKUP_DIR, slug, version);
  return dirExists(backupPath);
}
