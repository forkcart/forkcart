import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string | null;
  downloadUrl: string | null;
  publishedAt: string | null;
}

interface CachedResult {
  result: UpdateCheckResult;
  checkedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const GITHUB_REPO = 'forkcart/forkcart';
const DATA_DIR = resolve(process.cwd(), 'data');
const CACHE_FILE = resolve(DATA_DIR, 'update-check-cache.json');

/** Read current version from the root package.json */
function getCurrentVersion(): string {
  try {
    const rootPkg = resolve(process.cwd(), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(rootPkg, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Simple semver compare: returns true if latest > current */
function isNewer(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const c = parse(current);
  const l = parse(latest);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

/** Load cached result if still valid */
function loadCache(): UpdateCheckResult | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const cached: CachedResult = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() - cached.checkedAt < CACHE_TTL_MS) {
      // Re-check current version in case it changed after an update
      const currentVersion = getCurrentVersion();
      return {
        ...cached.result,
        currentVersion,
        updateAvailable: isNewer(currentVersion, cached.result.latestVersion),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Save result to cache */
function saveCache(result: UpdateCheckResult): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const cached: CachedResult = { result, checkedAt: Date.now() };
    writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  } catch {
    // Non-critical — just skip caching
  }
}

/** Check GitHub for the latest release */
export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();

  // Return cached result unless forced
  if (!force) {
    const cached = loadCache();
    if (cached) return cached;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ForkCart-UpdateChecker',
      },
    });

    if (!res.ok) {
      // GitHub API error — return "no update" with current info
      const result: UpdateCheckResult = {
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
        releaseNotes: null,
        downloadUrl: null,
        publishedAt: null,
      };
      return result;
    }

    const release = (await res.json()) as {
      tag_name: string;
      body: string;
      published_at: string;
      tarball_url: string;
    };

    const latestVersion = release.tag_name.replace(/^v/, '');
    const result: UpdateCheckResult = {
      currentVersion,
      latestVersion,
      updateAvailable: isNewer(currentVersion, latestVersion),
      releaseNotes: release.body ?? null,
      downloadUrl: `https://github.com/${GITHUB_REPO}/archive/refs/tags/${release.tag_name}.tar.gz`,
      publishedAt: release.published_at ?? null,
    };

    saveCache(result);
    return result;
  } catch {
    // Network error — return "no update"
    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      releaseNotes: null,
      downloadUrl: null,
      publishedAt: null,
    };
  }
}
