import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { plugins as pluginsTable } from '@forkcart/database/schemas';
import type {
  ListPluginsFilter,
  PluginStoreListing,
  SubmitPluginInput,
  PublishVersionInput,
  CategoryCount,
  UpdateAvailable,
  RegisterDeveloperInput,
} from './types';
import type { PluginLoader } from '../plugins/plugin-loader';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-store-service');

const REGISTRY_URL = process.env['PLUGIN_REGISTRY_URL'];

async function fetchRegistry(path: string, options?: RequestInit): Promise<Response | null> {
  if (!REGISTRY_URL) return null;
  try {
    const res = await fetch(`${REGISTRY_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res;
  } catch {
    // Registry unavailable
  }
  return null;
}

export interface PluginStoreServiceDeps {
  db: Database;
  pluginLoader: PluginLoader;
}

/**
 * PluginStoreService — pure registry proxy.
 *
 * All store data (listings, reviews, versions, developers) lives in the
 * Developer Portal DB.  This service proxies requests to the central registry
 * API and only touches the Core DB `plugins` table for local install tracking.
 */
export class PluginStoreService {
  private db: Database;
  private pluginLoader: PluginLoader;

  constructor(deps: PluginStoreServiceDeps) {
    this.db = deps.db;
    this.pluginLoader = deps.pluginLoader;
  }

  // ─── List & Search (registry proxy) ─────────────────────────────────────

  async listPlugins(filters: ListPluginsFilter = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.type) params.set('type', filters.type);
    if (filters.pricing) params.set('pricing', filters.pricing);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const res = await fetchRegistry(`/store?${params.toString()}`);
    if (res) {
      const body = (await res.json()) as {
        plugins?: PluginStoreListing[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      };
      return {
        data: (body.plugins ?? []) as PluginStoreListing[],
        pagination: body.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
    return {
      data: [] as PluginStoreListing[],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  async searchPlugins(query: string) {
    return this.listPlugins({ search: query });
  }

  // ─── Detail (registry proxy) ────────────────────────────────────────────

  async getPlugin(
    slug: string,
  ): Promise<
    | (PluginStoreListing & { versions?: unknown[]; reviews?: unknown[]; activeInstalls?: number })
    | null
  > {
    const res = await fetchRegistry(`/store/${slug}`);
    if (res) {
      const body = (await res.json()) as Record<string, unknown>;
      return (body.plugin || body) as PluginStoreListing & {
        versions?: unknown[];
        reviews?: unknown[];
        activeInstalls?: number;
      };
    }
    return null;
  }

  // ─── Submit & Publish (registry proxy) ──────────────────────────────────

  async submitPlugin(input: SubmitPluginInput) {
    const res = await fetchRegistry('/store/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res) return res.json();
    throw new Error('Registry unavailable — cannot submit plugin');
  }

  async publishVersion(listingId: string, input: PublishVersionInput) {
    const res = await fetchRegistry(`/store/${listingId}/versions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res) return res.json();
    throw new Error('Registry unavailable — cannot publish version');
  }

  // ─── Install & Uninstall ────────────────────────────────────────────────

  async installFromStore(slug: string) {
    if (!REGISTRY_URL) throw new Error('PLUGIN_REGISTRY_URL not configured');

    // Get plugin details from registry
    const detailRes = await fetch(`${REGISTRY_URL}/store/${slug}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!detailRes.ok) throw new Error(`Plugin "${slug}" not found in registry`);

    const detail = (await detailRes.json()) as {
      plugin: Record<string, unknown>;
      versions: Array<{ version: string; zipPath?: string }>;
    };
    const plugin = detail.plugin;
    const latestVersion = detail.versions?.[0];
    if (!latestVersion?.version) throw new Error('No version available');

    // Download ZIP
    const zipRes = await fetch(`${REGISTRY_URL}/store/${slug}/download/${latestVersion.version}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!zipRes.ok) throw new Error('ZIP download failed');

    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

    // Extract
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);
    const targetDir = resolve(process.cwd(), '../../packages/plugins', slug);
    await mkdir(targetDir, { recursive: true });
    zip.extractAllTo(targetDir, true);

    // Register in local plugins table
    const def = await this.pluginLoader.installPlugin(String(plugin.packageName || ''));
    if (def) {
      await this.pluginLoader.ensurePluginInDb(def);
    }

    logger.info({ slug, version: latestVersion.version }, 'Plugin installed from registry');

    return {
      listing: plugin,
      pluginName: String(plugin.name || slug),
      pluginVersion: latestVersion.version,
    };
  }

  async uninstallFromStore(slug: string): Promise<PluginStoreListing> {
    // Get plugin info from registry to find packageName
    const detail = await this.getPlugin(slug);
    if (!detail) throw new Error(`Plugin "${slug}" not found`);

    await this.pluginLoader.uninstallPlugin(String(detail.packageName || slug));
    logger.info({ slug }, 'Plugin uninstalled');
    return detail;
  }

  // ─── Reviews (registry proxy) ──────────────────────────────────────────

  async addReview(
    listingId: string,
    userId: string,
    rating: number,
    title: string | null = null,
    body: string | null = null,
  ) {
    const res = await fetchRegistry(`/store/${listingId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rating, title, body }),
    });
    if (res) return res.json();
    throw new Error('Registry unavailable — cannot add review');
  }

  // ─── Installed & Updates ────────────────────────────────────────────────

  async getInstalled() {
    // Query local plugins table (the real one that tracks installed plugins)
    return this.db
      .select()
      .from(pluginsTable)
      .where(sql`${pluginsTable.isActive} = true`);
  }

  async checkUpdates(): Promise<UpdateAvailable[]> {
    // Get local installed plugins
    const installed = await this.db
      .select()
      .from(pluginsTable)
      .where(sql`${pluginsTable.isActive} = true`);

    const updates: UpdateAvailable[] = [];

    for (const plugin of installed) {
      const meta = plugin.metadata as Record<string, unknown> | null;
      const registrySlug = meta?.slug as string | undefined;
      if (!registrySlug) continue;

      const detail = await this.getPlugin(registrySlug);
      if (!detail) continue;

      const remoteVersion = String(detail.version || '');
      if (remoteVersion && remoteVersion !== plugin.version) {
        updates.push({
          listingId: String(detail.id || ''),
          name: plugin.name,
          slug: registrySlug,
          installedVersion: plugin.version,
          latestVersion: remoteVersion,
          changelog: null,
        });
      }
    }

    return updates;
  }

  // ─── Featured & Categories (registry proxy) ────────────────────────────

  async getFeatured(): Promise<PluginStoreListing[]> {
    const res = await fetchRegistry('/store?sort=downloads&limit=12');
    if (res) {
      const body = (await res.json()) as { plugins?: PluginStoreListing[] };
      return body.plugins ?? [];
    }
    return [];
  }

  async getCategories(): Promise<CategoryCount[]> {
    const res = await fetchRegistry('/store/categories');
    if (res) {
      const body = (await res.json()) as { categories?: CategoryCount[] };
      return body.categories ?? [];
    }
    return [];
  }

  // ─── Developer (registry proxy) ────────────────────────────────────────

  async getMyPlugins(authorName: string): Promise<PluginStoreListing[]> {
    const res = await fetchRegistry(`/store?author=${encodeURIComponent(authorName)}`);
    if (res) {
      const body = (await res.json()) as { plugins?: PluginStoreListing[] };
      return body.plugins ?? [];
    }
    return [];
  }

  async registerDeveloper(_input: RegisterDeveloperInput, _userId?: string) {
    throw new Error('Developer registration is handled by the Developer Portal');
  }

  async getDeveloperByApiKey(_apiKey: string) {
    return null;
  }

  async getDeveloperById(_id: string) {
    return null;
  }

  async getDeveloperByUserId(_userId: string) {
    return null;
  }

  async verifyDeveloper(_id: string) {
    return null;
  }
}
