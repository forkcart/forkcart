import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { exec, execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export type UpdateStepName =
  | 'downloading'
  | 'extracting'
  | 'backing_up'
  | 'copying'
  | 'installing'
  | 'building'
  | 'migrating'
  | 'complete';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface UpdateStep {
  name: UpdateStepName;
  status: StepStatus;
  message: string;
  timestamp: string | null;
}

export interface UpdateStatus {
  active: boolean;
  version: string | null;
  steps: UpdateStep[];
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface UpdateLogEntry {
  version: string;
  fromVersion: string;
  status: 'success' | 'failed' | 'rolled_back';
  startedAt: string;
  completedAt: string;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GITHUB_REPO = 'forkcart/forkcart';

// ─── Paths ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(process.cwd(), '..');
const DATA_DIR = resolve(process.cwd(), 'data');
const STATUS_FILE = resolve(DATA_DIR, 'update-status.json');
const LOG_FILE = resolve(DATA_DIR, 'update-log.json');
const RESTART_FLAG = resolve(DATA_DIR, '.restart-pending');
const BACKUPS_DIR = resolve(PROJECT_ROOT, 'backups');

/** Directories to preserve (never overwrite during update) */
const PRESERVE_DIRS = ['.env', 'data', 'node_modules', 'backups', '.git', 'uploads'];

/** Directories/files to copy from the new release */
const COPY_DIRS = [
  'packages',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.json',
  '.prettierrc',
  '.prettierignore',
  '.eslintrc.cjs',
];

// ─── Step names for ordered iteration ───────────────────────────────────────

const STEP_NAMES: UpdateStepName[] = [
  'downloading',
  'extracting',
  'backing_up',
  'copying',
  'installing',
  'building',
  'migrating',
  'complete',
];

// ─── In-memory status (also persisted to disk) ──────────────────────────────

let currentStatus: UpdateStatus = loadStatusFromDisk();

function defaultStatus(): UpdateStatus {
  return {
    active: false,
    version: null,
    steps: STEP_NAMES.map((name) => ({
      name,
      status: 'pending' as StepStatus,
      message: '',
      timestamp: null,
    })),
    error: null,
    startedAt: null,
    completedAt: null,
  };
}

function loadStatusFromDisk(): UpdateStatus {
  try {
    if (existsSync(STATUS_FILE)) {
      return JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch {
    // corrupt file
  }
  return defaultStatus();
}

function persistStatus(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STATUS_FILE, JSON.stringify(currentStatus, null, 2), 'utf-8');
  } catch {
    // non-critical
  }
}

function setStep(name: UpdateStepName, status: StepStatus, message = ''): void {
  const step = currentStatus.steps.find((s) => s.name === name);
  if (step) {
    step.status = status;
    step.message = message;
    step.timestamp = new Date().toISOString();
  }
  persistStatus();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function isUpdateRunning(): boolean {
  return currentStatus.active;
}

/** Get the update history log */
export function getUpdateLog(): UpdateLogEntry[] {
  try {
    if (existsSync(LOG_FILE)) {
      return JSON.parse(readFileSync(LOG_FILE, 'utf-8'));
    }
  } catch {
    // corrupt file
  }
  return [];
}

/**
 * Schedule an application restart after a successful update.
 * Tries systemd first, then pm2, then falls back to process.exit (Docker/node restart).
 */
function scheduleRestart(version: string): void {
  console.log(`[update] Scheduling restart for v${version}...`);

  // Write restart flag so the UI knows a restart happened intentionally
  writeFileSync(
    RESTART_FLAG,
    JSON.stringify({ version, updatedAt: new Date().toISOString() }),
    'utf-8',
  );

  // Give the client time to poll the "complete" status before we restart
  setTimeout(() => {
    // Try systemd first
    try {
      execSync('systemctl is-active forkcart-api', { stdio: 'pipe' });
      console.log('[update] Restarting via systemd...');
      exec(
        'systemctl restart forkcart-api forkcart-admin 2>/dev/null; systemctl restart forkcart 2>/dev/null',
        {
          timeout: 30_000,
        },
      );
      return;
    } catch {
      // not running under systemd
    }

    // Try pm2
    try {
      execSync('pm2 pid forkcart-api', { stdio: 'pipe' });
      console.log('[update] Restarting via pm2...');
      exec('pm2 restart forkcart-api && pm2 restart forkcart-admin 2>/dev/null || true', {
        timeout: 30_000,
      });
      return;
    } catch {
      // not running under pm2
    }

    // Fallback: exit process (works with Docker restart: always, or any process manager)
    console.log('[update] Restarting via process.exit (container/process manager will restart)...');
    process.exit(0);
  }, 3000);
}

/** Append an entry to the update log */
function appendLog(entry: UpdateLogEntry): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    let log: UpdateLogEntry[] = [];
    if (existsSync(LOG_FILE)) {
      log = JSON.parse(readFileSync(LOG_FILE, 'utf-8'));
    }
    log.push(entry);
    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
  } catch {
    // non-critical
  }
}

/** Get the current version from root package.json */
function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'package.json'), 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Run shell command in project root, throw on failure */
function run(cmd: string, label: string): void {
  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 1_200_000, // 20 min max per step
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${label} failed: ${msg}`);
  }
}

// ─── Core update flow ───────────────────────────────────────────────────────

/** Allowed download URL prefix — only official GitHub releases */
const ALLOWED_URL_PREFIX = `https://github.com/${GITHUB_REPO}/`;

/** Compute SHA256 hash of a file */
async function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/** Try to extract a SHA256 hash from release notes (common pattern: `SHA256: <hex>`) */
function extractSha256FromNotes(releaseNotes: string | null | undefined): string | null {
  if (!releaseNotes) return null;
  const match = releaseNotes.match(/SHA256:\s*([a-fA-F0-9]{64})/i);
  return match?.[1] ? match[1].toLowerCase() : null;
}

export async function applyUpdate(
  targetVersion: string,
  downloadUrl: string,
  releaseNotes?: string | null,
): Promise<void> {
  if (currentStatus.active) {
    throw new Error('An update is already in progress');
  }

  // Validate download URL — only allow official GitHub releases
  if (!downloadUrl.startsWith(ALLOWED_URL_PREFIX)) {
    throw new Error(`Untrusted download URL rejected. URL must start with ${ALLOWED_URL_PREFIX}`);
  }

  const fromVersion = getCurrentVersion();
  const startedAt = new Date().toISOString();

  // Reset status
  currentStatus = defaultStatus();
  currentStatus.active = true;
  currentStatus.version = targetVersion;
  currentStatus.startedAt = startedAt;
  persistStatus();

  const tmpDir = resolve(PROJECT_ROOT, '.update-tmp');
  const backupDir = resolve(BACKUPS_DIR, `v${fromVersion}-${Date.now()}`);

  try {
    // ── 1. Download ─────────────────────────────────────────────────────────
    setStep('downloading', 'running', `Downloading v${targetVersion}...`);
    const tarPath = resolve(tmpDir, 'release.tar.gz');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    const res = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'ForkCart-Updater' },
      redirect: 'follow',
    });
    if (!res.ok || !res.body) {
      throw new Error(`Download failed: HTTP ${res.status}`);
    }
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tarPath));

    // Compute SHA256 checksum of downloaded file
    const downloadHash = await computeSha256(tarPath);
    console.log(`[update] Downloaded v${targetVersion} — SHA256: ${downloadHash}`);

    // If release notes contain a SHA256, verify it matches
    const expectedHash = extractSha256FromNotes(releaseNotes);
    if (expectedHash && expectedHash !== downloadHash) {
      throw new Error(
        `SHA256 checksum mismatch! Expected ${expectedHash} but got ${downloadHash}. Download may be corrupted or tampered with.`,
      );
    }
    if (expectedHash) {
      console.log(`[update] SHA256 checksum verified ✓`);
    }

    setStep('downloading', 'done', `Downloaded (SHA256: ${downloadHash.slice(0, 12)}…)`);

    // ── 2. Extract ──────────────────────────────────────────────────────────
    setStep('extracting', 'running', 'Extracting archive...');
    const extractDir = resolve(tmpDir, 'extracted');
    mkdirSync(extractDir, { recursive: true });
    execSync(`tar -xzf "${tarPath}" -C "${extractDir}" --strip-components=1`, {
      stdio: 'pipe',
      timeout: 120_000,
    });
    setStep('extracting', 'done', 'Extracted');

    // ── 3. Backup ───────────────────────────────────────────────────────────
    setStep('backing_up', 'running', `Backing up to ${backupDir}...`);
    mkdirSync(backupDir, { recursive: true });
    for (const entry of COPY_DIRS) {
      const src = resolve(PROJECT_ROOT, entry);
      if (existsSync(src)) {
        cpSync(src, resolve(backupDir, entry), { recursive: true });
      }
    }
    setStep('backing_up', 'done', 'Backup complete');

    // ── 4. Copy new files ───────────────────────────────────────────────────
    setStep('copying', 'running', 'Copying new files...');
    for (const entry of COPY_DIRS) {
      const src = resolve(extractDir, entry);
      const dest = resolve(PROJECT_ROOT, entry);
      if (existsSync(src)) {
        // Remove old first (except preserved dirs), then copy
        if (existsSync(dest) && !PRESERVE_DIRS.includes(entry)) {
          rmSync(dest, { recursive: true, force: true });
        }
        cpSync(src, dest, { recursive: true, force: true });
      }
    }
    setStep('copying', 'done', 'Files updated');

    // ── 5. Install dependencies ─────────────────────────────────────────────
    setStep('installing', 'running', 'Installing dependencies...');
    try {
      run('pnpm install --frozen-lockfile', 'pnpm install');
    } catch {
      // Lockfile might have changed — try without frozen
      run('pnpm install', 'pnpm install (unfrozen)');
    }
    setStep('installing', 'done', 'Dependencies installed');

    // ── 6. Build ────────────────────────────────────────────────────────────
    setStep('building', 'running', 'Building project...');
    run('rm -rf packages/admin/.next packages/storefront/.next', 'Clean caches');
    run('pnpm build', 'pnpm build');
    setStep('building', 'done', 'Build complete');

    // ── 7. Migrate DB ───────────────────────────────────────────────────────
    setStep('migrating', 'running', 'Running database migrations...');
    run('pnpm db:migrate', 'DB migrations');
    setStep('migrating', 'done', 'Migrations complete');

    // ── 8. Complete ─────────────────────────────────────────────────────────
    setStep('complete', 'done', 'Update complete — restart required');
    currentStatus.active = false;
    currentStatus.completedAt = new Date().toISOString();
    persistStatus();

    // Log success
    appendLog({
      version: targetVersion,
      fromVersion,
      status: 'success',
      startedAt,
      completedAt: new Date().toISOString(),
    });

    // Cleanup temp
    rmSync(tmpDir, { recursive: true, force: true });

    // Auto-restart the application
    scheduleRestart(targetVersion);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const failedStep = currentStatus.steps.find((s) => s.status === 'running');
    if (failedStep) {
      setStep(failedStep.name, 'failed', errorMsg);
    }
    currentStatus.error = errorMsg;
    persistStatus();

    // ── ROLLBACK ────────────────────────────────────────────────────────────
    console.error(`[update] FAILED at step: ${failedStep?.name ?? 'unknown'} — rolling back...`);
    try {
      if (existsSync(backupDir)) {
        for (const entry of COPY_DIRS) {
          const src = resolve(backupDir, entry);
          const dest = resolve(PROJECT_ROOT, entry);
          if (existsSync(src)) {
            if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
            cpSync(src, dest, { recursive: true });
          }
        }
        console.log('[update] Rollback from backup complete');
        // Re-install deps after rollback
        try {
          execSync('pnpm install --frozen-lockfile', {
            cwd: PROJECT_ROOT,
            stdio: 'pipe',
            timeout: 300_000,
          });
        } catch {
          try {
            execSync('pnpm install', { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 300_000 });
          } catch {
            console.error('[update] Could not restore dependencies after rollback');
          }
        }
      }
    } catch (rollbackErr) {
      console.error('[update] ROLLBACK FAILED:', rollbackErr);
    }

    currentStatus.active = false;
    currentStatus.completedAt = new Date().toISOString();
    persistStatus();

    // Log failure
    appendLog({
      version: targetVersion,
      fromVersion,
      status: existsSync(backupDir) ? 'rolled_back' : 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      error: errorMsg,
    });

    // Cleanup temp
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
