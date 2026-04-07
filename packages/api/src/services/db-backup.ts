import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BACKUP_DIR = process.env['FORKCART_BACKUP_DIR'] || path.join(process.cwd(), 'backups');
const MAX_BACKUPS = Number(process.env['FORKCART_MAX_BACKUPS'] || '10');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export function createBackup(): BackupInfo {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `forkcart-${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);
  const dbUrl = getDatabaseUrl();

  execSync(`pg_dump "${dbUrl}" | gzip > "${filepath}"`, {
    timeout: 120_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const stat = fs.statSync(filepath);
  return {
    filename,
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
  };
}

export function listBackups(): BackupInfo[] {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('forkcart-') && f.endsWith('.sql.gz'))
    .map((filename) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, filename));
      return {
        filename,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteBackup(filename: string): void {
  if (!filename.startsWith('forkcart-') || !filename.endsWith('.sql.gz')) {
    throw new Error('Invalid backup filename');
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup ${filename} not found`);
  }
  fs.unlinkSync(filepath);
}

export function restoreBackup(filename: string): void {
  if (!filename.startsWith('forkcart-') || !filename.endsWith('.sql.gz')) {
    throw new Error('Invalid backup filename');
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup ${filename} not found`);
  }
  const dbUrl = getDatabaseUrl();

  execSync(`gunzip -c "${filepath}" | psql "${dbUrl}"`, {
    timeout: 300_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export function cleanupBackups(): void {
  const backups = listBackups();
  if (backups.length <= MAX_BACKUPS) return;

  const toDelete = backups.slice(MAX_BACKUPS);
  for (const backup of toDelete) {
    fs.unlinkSync(path.join(BACKUP_DIR, backup.filename));
  }
}
