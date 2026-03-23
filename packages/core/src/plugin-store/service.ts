import { eq, desc, and, ilike, or, sql, asc } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Database } from '@forkcart/database';
import {
  pluginStoreListings,
  pluginStoreVersions,
  pluginStoreReviews,
  pluginStoreInstalls,
  pluginDevelopers,
} from '@forkcart/database/schemas';
import type {
  ListPluginsFilter,
  SubmitPluginInput,
  PublishVersionInput,
  CategoryCount,
  UpdateAvailable,
  RegisterDeveloperInput,
  ForkcartPluginManifest,
} from './types';
import type { PluginLoader } from '../plugins/plugin-loader';
import { createLogger } from '../lib/logger';

const logger = createLogger('plugin-store-service');

export interface PluginStoreServiceDeps {
  db: Database;
  pluginLoader: PluginLoader;
}

export class PluginStoreService {
  private db: Database;
  private pluginLoader: PluginLoader;

  constructor(deps: PluginStoreServiceDeps) {
    this.db = deps.db;
    this.pluginLoader = deps.pluginLoader;
  }

  // ─── List & Search ──────────────────────────────────────────────────────────

  async listPlugins(filters: ListPluginsFilter = {}) {
    const { search, category, type, pricing, sort = 'downloads', page = 1, limit = 20 } = filters;

    const conditions = [eq(pluginStoreListings.status, 'approved')];

    if (search) {
      conditions.push(
        or(
          ilike(pluginStoreListings.name, `%${search}%`),
          ilike(pluginStoreListings.description, `%${search}%`),
          ilike(pluginStoreListings.shortDescription, `%${search}%`),
        )!,
      );
    }
    if (category) {
      conditions.push(eq(pluginStoreListings.category, category));
    }
    if (type) {
      conditions.push(eq(pluginStoreListings.type, type));
    }
    if (pricing) {
      conditions.push(eq(pluginStoreListings.pricing, pricing));
    }

    const orderBy =
      sort === 'newest'
        ? [desc(pluginStoreListings.publishedAt)]
        : sort === 'rating'
          ? [desc(pluginStoreListings.rating)]
          : sort === 'name'
            ? [asc(pluginStoreListings.name)]
            : [desc(pluginStoreListings.downloads)];

    const offset = (page - 1) * limit;

    const data = await this.db.query.pluginStoreListings.findMany({
      where: and(...conditions),
      orderBy,
      limit,
      offset,
    });

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(pluginStoreListings)
      .where(and(...conditions));

    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    };
  }

  async searchPlugins(query: string) {
    return this.listPlugins({ search: query });
  }

  // ─── Detail ─────────────────────────────────────────────────────────────────

  async getPlugin(slug: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
      with: {
        versions: {
          orderBy: [desc(pluginStoreVersions.createdAt)],
        },
        reviews: {
          orderBy: [desc(pluginStoreReviews.createdAt)],
          limit: 10,
        },
      },
    });

    if (!listing) return null;

    // Get active install count
    const [installCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(pluginStoreInstalls)
      .where(
        and(eq(pluginStoreInstalls.listingId, listing.id), eq(pluginStoreInstalls.isActive, true)),
      );

    return {
      ...listing,
      activeInstalls: installCount?.count ?? 0,
    };
  }

  // ─── Submit & Publish ───────────────────────────────────────────────────────

  async submitPlugin(input: SubmitPluginInput) {
    const [listing] = await this.db
      .insert(pluginStoreListings)
      .values({
        name: input.name,
        slug: input.slug,
        packageName: input.packageName,
        description: input.description ?? null,
        shortDescription: input.shortDescription ?? null,
        author: input.author ?? null,
        authorUrl: input.authorUrl ?? null,
        version: input.version,
        type: input.type ?? 'other',
        category: input.category ?? null,
        icon: input.icon ?? null,
        screenshots: input.screenshots ?? [],
        readme: input.readme ?? null,
        pricing: input.pricing ?? 'free',
        price: input.price ?? null,
        tags: input.tags ?? [],
        requirements: input.requirements ?? {},
        repository: input.repository ?? null,
        license: input.license ?? null,
        status: 'pending_review',
      })
      .returning();

    // Create the first version
    if (listing) {
      await this.db.insert(pluginStoreVersions).values({
        listingId: listing.id,
        version: input.version,
        packageName: input.packageName,
        changelog: input.changelog ?? 'Initial release',
        minForkcartVersion: input.minForkcartVersion ?? null,
        status: 'pending',
      });
    }

    return listing;
  }

  async publishVersion(listingId: string, input: PublishVersionInput) {
    const [version] = await this.db
      .insert(pluginStoreVersions)
      .values({
        listingId,
        version: input.version,
        packageName: input.packageName,
        changelog: input.changelog ?? null,
        minForkcartVersion: input.minForkcartVersion ?? null,
        size: input.size ?? null,
        status: 'pending',
      })
      .returning();

    // Update listing version
    await this.db
      .update(pluginStoreListings)
      .set({
        version: input.version,
        packageName: input.packageName,
        updatedAt: new Date(),
      })
      .where(eq(pluginStoreListings.id, listingId));

    return version;
  }

  // ─── Install & Uninstall ────────────────────────────────────────────────────

  async installFromStore(slug: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
    });
    if (!listing) throw new Error(`Plugin "${slug}" not found in store`);

    // Install via npm through plugin loader
    const def = await this.pluginLoader.installPlugin(listing.packageName);
    if (!def) throw new Error(`Failed to install package "${listing.packageName}"`);

    // Ensure in DB
    await this.pluginLoader.ensurePluginInDb(def);

    // Track install
    await this.db.insert(pluginStoreInstalls).values({
      listingId: listing.id,
      version: listing.version,
    });

    // Increment download count
    await this.db
      .update(pluginStoreListings)
      .set({
        downloads: sql`${pluginStoreListings.downloads} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(pluginStoreListings.id, listing.id));

    logger.info({ slug, packageName: listing.packageName }, 'Plugin installed from store');

    return { listing, pluginName: def.name, pluginVersion: def.version };
  }

  async uninstallFromStore(slug: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
    });
    if (!listing) throw new Error(`Plugin "${slug}" not found in store`);

    // Uninstall via plugin loader
    await this.pluginLoader.uninstallPlugin(listing.packageName);

    // Mark install as inactive
    await this.db
      .update(pluginStoreInstalls)
      .set({
        isActive: false,
        uninstalledAt: new Date(),
      })
      .where(
        and(eq(pluginStoreInstalls.listingId, listing.id), eq(pluginStoreInstalls.isActive, true)),
      );

    logger.info({ slug, packageName: listing.packageName }, 'Plugin uninstalled from store');

    return listing;
  }

  // ─── Reviews ────────────────────────────────────────────────────────────────

  async addReview(
    listingId: string,
    userId: string,
    rating: number,
    title: string | null = null,
    body: string | null = null,
  ) {
    const [review] = await this.db
      .insert(pluginStoreReviews)
      .values({
        listingId,
        userId,
        rating,
        title,
        body,
      })
      .returning();

    // Recalculate average rating
    const [stats] = await this.db
      .select({
        avgRating: sql<string>`avg(${pluginStoreReviews.rating})::numeric(3,2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(pluginStoreReviews)
      .where(
        and(eq(pluginStoreReviews.listingId, listingId), eq(pluginStoreReviews.status, 'active')),
      );

    if (stats) {
      await this.db
        .update(pluginStoreListings)
        .set({
          rating: stats.avgRating ?? '0',
          ratingCount: stats.count ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(pluginStoreListings.id, listingId));
    }

    return review;
  }

  // ─── Installed & Updates ────────────────────────────────────────────────────

  async getInstalled() {
    const installs = await this.db.query.pluginStoreInstalls.findMany({
      where: eq(pluginStoreInstalls.isActive, true),
      with: {
        listing: true,
      },
      orderBy: [desc(pluginStoreInstalls.installedAt)],
    });

    return installs;
  }

  async checkUpdates(): Promise<UpdateAvailable[]> {
    const installs = await this.db.query.pluginStoreInstalls.findMany({
      where: eq(pluginStoreInstalls.isActive, true),
      with: {
        listing: true,
      },
    });

    const updates: UpdateAvailable[] = [];

    for (const install of installs) {
      if (install.listing && install.version !== install.listing.version) {
        // Get latest version changelog
        const latestVersion = await this.db.query.pluginStoreVersions.findFirst({
          where: and(
            eq(pluginStoreVersions.listingId, install.listing.id),
            eq(pluginStoreVersions.version, install.listing.version),
          ),
        });

        updates.push({
          listingId: install.listing.id,
          name: install.listing.name,
          slug: install.listing.slug,
          installedVersion: install.version,
          latestVersion: install.listing.version,
          changelog: latestVersion?.changelog ?? null,
        });
      }
    }

    return updates;
  }

  // ─── Featured & Categories ──────────────────────────────────────────────────

  async getFeatured() {
    return this.db.query.pluginStoreListings.findMany({
      where: eq(pluginStoreListings.status, 'approved'),
      orderBy: [desc(pluginStoreListings.downloads)],
      limit: 12,
    });
  }

  async getCategories(): Promise<CategoryCount[]> {
    const result = await this.db
      .select({
        category: pluginStoreListings.category,
        count: sql<number>`count(*)::int`,
      })
      .from(pluginStoreListings)
      .where(eq(pluginStoreListings.status, 'approved'))
      .groupBy(pluginStoreListings.category)
      .orderBy(asc(pluginStoreListings.category));

    return result
      .filter((r) => r.category != null)
      .map((r) => ({
        category: r.category!,
        count: r.count,
      }));
  }

  // ─── Developer ──────────────────────────────────────────────────────────────

  async getMyPlugins(authorName: string) {
    return this.db.query.pluginStoreListings.findMany({
      where: eq(pluginStoreListings.author, authorName),
      orderBy: [desc(pluginStoreListings.updatedAt)],
      with: {
        versions: {
          orderBy: [desc(pluginStoreVersions.createdAt)],
          limit: 5,
        },
      },
    });
  }

  // ─── Developer Accounts ───────────────────────────────────────────────────

  async registerDeveloper(input: RegisterDeveloperInput, userId?: string) {
    const apiKey = `fcdev_${randomBytes(32).toString('hex')}`;

    const [developer] = await this.db
      .insert(pluginDevelopers)
      .values({
        userId: userId ?? null,
        companyName: input.companyName,
        website: input.website ?? null,
        description: input.description ?? null,
        logo: input.logo ?? null,
        apiKey,
      })
      .returning();

    logger.info(
      { developerId: developer?.id, companyName: input.companyName },
      'Developer registered',
    );
    return developer;
  }

  async getDeveloperByApiKey(apiKey: string) {
    return this.db.query.pluginDevelopers.findFirst({
      where: eq(pluginDevelopers.apiKey, apiKey),
    });
  }

  async getDeveloperById(id: string) {
    return this.db.query.pluginDevelopers.findFirst({
      where: eq(pluginDevelopers.id, id),
    });
  }

  async getDeveloperByUserId(userId: string) {
    return this.db.query.pluginDevelopers.findFirst({
      where: eq(pluginDevelopers.userId, userId),
    });
  }

  async verifyDeveloper(id: string) {
    const [updated] = await this.db
      .update(pluginDevelopers)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(pluginDevelopers.id, id))
      .returning();
    return updated;
  }

  // ─── ZIP Upload & Validation ──────────────────────────────────────────────

  private static readonly STORAGE_PATH = '/var/lib/forkcart/plugins';

  private static readonly DANGEROUS_PATTERNS = [
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\bexecSync\s*\(/,
    /\bspawnSync?\s*\(/,
    /\bchild_process\b/,
    /\bFunction\s*\(/,
    /require\s*\(\s*['"]child_process['"]\s*\)/,
    /import\s+.*['"]child_process['"]/,
  ];

  async validateAndStoreZip(
    zipBuffer: Buffer,
    _developerId: string,
  ): Promise<{
    manifest: ForkcartPluginManifest;
    zipPath: string;
    readme: string | null;
    warnings: string[];
  }> {
    // Dynamic import for adm-zip (we'll use the built-in node:zlib approach)
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    const warnings: string[] = [];

    // 1. Check for forkcart-plugin.json
    const manifestEntry = entries.find(
      (e) =>
        e.entryName === 'forkcart-plugin.json' || e.entryName.endsWith('/forkcart-plugin.json'),
    );
    if (!manifestEntry) {
      throw new Error('ZIP must contain a forkcart-plugin.json at the root');
    }

    let manifest: ForkcartPluginManifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
    } catch {
      throw new Error('forkcart-plugin.json is not valid JSON');
    }

    // Validate required fields
    if (
      !manifest.name ||
      !manifest.slug ||
      !manifest.version ||
      !manifest.type ||
      !manifest.packageName
    ) {
      throw new Error('forkcart-plugin.json must contain: name, slug, packageName, version, type');
    }

    // 2. Check for package.json
    const packageJsonEntry = entries.find(
      (e) => e.entryName === 'package.json' || e.entryName.endsWith('/package.json'),
    );
    if (!packageJsonEntry) {
      throw new Error('ZIP must contain a package.json');
    }

    // 3. Check for README.md
    const readmeEntry = entries.find(
      (e) =>
        e.entryName.toLowerCase() === 'readme.md' ||
        e.entryName.toLowerCase().endsWith('/readme.md'),
    );
    if (!readmeEntry) {
      warnings.push('No README.md found — recommended for store listing');
    }

    const readme = readmeEntry ? readmeEntry.getData().toString('utf-8') : null;

    // 4. Security scan — check JS/TS files for dangerous patterns
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.toLowerCase();
      if (!name.endsWith('.js') && !name.endsWith('.ts') && !name.endsWith('.mjs')) continue;

      const content = entry.getData().toString('utf-8');
      for (const pattern of PluginStoreService.DANGEROUS_PATTERNS) {
        if (pattern.test(content)) {
          warnings.push(
            `Security: ${entry.entryName} contains potentially dangerous pattern: ${pattern.source}`,
          );
        }
      }
    }

    // 5. Store the ZIP
    const storagePath = resolve(PluginStoreService.STORAGE_PATH);
    await mkdir(storagePath, { recursive: true });
    const fileName = `${manifest.slug}-${manifest.version}.zip`;
    const zipPath = join(storagePath, fileName);
    await writeFile(zipPath, zipBuffer);

    logger.info({ slug: manifest.slug, version: manifest.version, zipPath }, 'Plugin ZIP stored');

    return { manifest, zipPath, readme, warnings };
  }

  async uploadPlugin(zipBuffer: Buffer, developerId: string) {
    const { manifest, zipPath, readme, warnings } = await this.validateAndStoreZip(
      zipBuffer,
      developerId,
    );

    // Check if listing already exists
    const existing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, manifest.slug),
    });

    if (existing) {
      // New version upload
      if (existing.developerId !== developerId) {
        throw new Error('You do not own this plugin listing');
      }

      // Create new version
      const [version] = await this.db
        .insert(pluginStoreVersions)
        .values({
          listingId: existing.id,
          version: manifest.version,
          packageName: manifest.packageName,
          changelog: manifest.description ?? 'New version',
          minForkcartVersion: manifest.minForkcartVersion ?? null,
          zipPath,
          size: zipBuffer.length,
          status: 'pending',
        })
        .returning();

      // Update listing to in_review
      await this.db
        .update(pluginStoreListings)
        .set({
          version: manifest.version,
          status: 'in_review',
          updatedAt: new Date(),
        })
        .where(eq(pluginStoreListings.id, existing.id));

      logger.info(
        { slug: manifest.slug, version: manifest.version },
        'New plugin version uploaded',
      );

      return { listing: existing, version, warnings, isNewVersion: true };
    }

    // New plugin
    const [listing] = await this.db
      .insert(pluginStoreListings)
      .values({
        name: manifest.name,
        slug: manifest.slug,
        packageName: manifest.packageName,
        description: manifest.description ?? null,
        author: manifest.author ?? null,
        version: manifest.version,
        type: manifest.type ?? 'other',
        readme: readme ?? null,
        license: manifest.license ?? null,
        status: 'in_review',
        developerId,
      })
      .returning();

    const [version] = await this.db
      .insert(pluginStoreVersions)
      .values({
        listingId: listing!.id,
        version: manifest.version,
        packageName: manifest.packageName,
        changelog: 'Initial release',
        minForkcartVersion: manifest.minForkcartVersion ?? null,
        zipPath,
        size: zipBuffer.length,
        status: 'pending',
      })
      .returning();

    logger.info({ slug: manifest.slug, version: manifest.version }, 'New plugin uploaded');

    return { listing, version, warnings, isNewVersion: false };
  }

  // ─── Review & Approval Workflow ───────────────────────────────────────────

  async getPendingPlugins() {
    return this.db.query.pluginStoreListings.findMany({
      where: eq(pluginStoreListings.status, 'in_review'),
      orderBy: [asc(pluginStoreListings.updatedAt)],
      with: {
        versions: {
          orderBy: [desc(pluginStoreVersions.createdAt)],
          limit: 1,
        },
      },
    });
  }

  async approvePlugin(slug: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
    });
    if (!listing) throw new Error(`Plugin "${slug}" not found`);
    if (listing.status !== 'in_review') {
      throw new Error(`Plugin "${slug}" is not in review (status: ${listing.status})`);
    }

    const [updated] = await this.db
      .update(pluginStoreListings)
      .set({
        status: 'approved',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pluginStoreListings.id, listing.id))
      .returning();

    // Also approve pending versions
    await this.db
      .update(pluginStoreVersions)
      .set({ status: 'published', publishedAt: new Date() })
      .where(
        and(
          eq(pluginStoreVersions.listingId, listing.id),
          eq(pluginStoreVersions.status, 'pending'),
        ),
      );

    logger.info({ slug }, 'Plugin approved');
    return updated;
  }

  async rejectPlugin(slug: string, reason: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
    });
    if (!listing) throw new Error(`Plugin "${slug}" not found`);
    if (listing.status !== 'in_review') {
      throw new Error(`Plugin "${slug}" is not in review (status: ${listing.status})`);
    }

    const [updated] = await this.db
      .update(pluginStoreListings)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(pluginStoreListings.id, listing.id))
      .returning();

    // Also reject pending versions
    await this.db
      .update(pluginStoreVersions)
      .set({ status: 'rejected' })
      .where(
        and(
          eq(pluginStoreVersions.listingId, listing.id),
          eq(pluginStoreVersions.status, 'pending'),
        ),
      );

    logger.info({ slug, reason }, 'Plugin rejected');
    return { ...updated, rejectionReason: reason };
  }

  // ─── Install from ZIP ─────────────────────────────────────────────────────

  async installFromZip(slug: string) {
    const listing = await this.db.query.pluginStoreListings.findFirst({
      where: eq(pluginStoreListings.slug, slug),
      with: {
        versions: {
          orderBy: [desc(pluginStoreVersions.createdAt)],
          limit: 1,
        },
      },
    });
    if (!listing) throw new Error(`Plugin "${slug}" not found in store`);
    if (listing.status !== 'approved') {
      throw new Error(`Plugin "${slug}" is not approved`);
    }

    const latestVersion = listing.versions?.[0];
    if (!latestVersion?.zipPath) {
      // Fallback to npm install
      return this.installFromStore(slug);
    }

    // Read the ZIP and extract to packages/plugins/
    const AdmZip = (await import('adm-zip')).default;
    const zipBuffer = await readFile(latestVersion.zipPath);
    const zip = new AdmZip(zipBuffer);
    const targetDir = resolve(process.cwd(), '../plugins', listing.slug);
    await mkdir(targetDir, { recursive: true });
    zip.extractAllTo(targetDir, true);

    // Track install
    await this.db.insert(pluginStoreInstalls).values({
      listingId: listing.id,
      version: latestVersion.version,
    });

    // Increment download count
    await this.db
      .update(pluginStoreListings)
      .set({
        downloads: sql`${pluginStoreListings.downloads} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(pluginStoreListings.id, listing.id));

    logger.info({ slug, version: latestVersion.version, targetDir }, 'Plugin installed from ZIP');

    return {
      listing,
      pluginName: listing.name,
      pluginVersion: latestVersion.version,
      installedTo: targetDir,
    };
  }

  // ─── Developer Plugins ────────────────────────────────────────────────────

  async getPluginsByDeveloper(developerId: string) {
    return this.db.query.pluginStoreListings.findMany({
      where: eq(pluginStoreListings.developerId, developerId),
      orderBy: [desc(pluginStoreListings.updatedAt)],
      with: {
        versions: {
          orderBy: [desc(pluginStoreVersions.createdAt)],
          limit: 5,
        },
      },
    });
  }
}
