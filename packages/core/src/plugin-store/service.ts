import { eq, desc, and, ilike, or, sql, asc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import {
  pluginStoreListings,
  pluginStoreVersions,
  pluginStoreReviews,
  pluginStoreInstalls,
} from '@forkcart/database/schemas';
import type {
  ListPluginsFilter,
  SubmitPluginInput,
  PublishVersionInput,
  CategoryCount,
  UpdateAvailable,
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
}
