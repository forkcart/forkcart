import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const pluginStoreListings = pgTable(
  'plugin_store_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    packageName: varchar('package_name', { length: 255 }).notNull().unique(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    author: varchar('author', { length: 255 }),
    authorUrl: text('author_url'),
    version: varchar('version', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('other'),
    category: varchar('category', { length: 100 }),
    icon: text('icon'),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),
    readme: text('readme'),
    pricing: varchar('pricing', { length: 20 }).notNull().default('free'),
    price: numeric('price'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    downloads: integer('downloads').notNull().default(0),
    rating: numeric('rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    tags: jsonb('tags').$type<string[]>().default([]),
    requirements: jsonb('requirements').$type<Record<string, string>>().default({}),
    repository: text('repository'),
    license: varchar('license', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    isFeatured: boolean('is_featured').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    developerId: uuid('developer_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_store_listings_developer_id_idx').on(table.developerId),
    index('plugin_store_listings_type_idx').on(table.type),
    index('plugin_store_listings_category_idx').on(table.category),
    index('plugin_store_listings_status_idx').on(table.status),
    index('plugin_store_listings_pricing_idx').on(table.pricing),
    index('plugin_store_listings_is_featured_idx').on(table.isFeatured),
    index('plugin_store_listings_downloads_idx').on(table.downloads),
    index('plugin_store_listings_rating_idx').on(table.rating),
  ],
);

export const pluginStoreVersions = pgTable(
  'plugin_store_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => pluginStoreListings.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    packageName: varchar('package_name', { length: 255 }).notNull(),
    changelog: text('changelog'),
    minForkcartVersion: varchar('min_forkcart_version', { length: 50 }),
    size: integer('size'),
    downloads: integer('downloads').notNull().default(0),
    zipPath: text('zip_path'),
    status: varchar('status', { length: 20 }).notNull().default('published'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_store_versions_listing_id_idx').on(table.listingId),
    uniqueIndex('plugin_store_versions_listing_version_idx').on(table.listingId, table.version),
  ],
);

export const pluginStoreReviews = pgTable(
  'plugin_store_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => pluginStoreListings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 255 }),
    body: text('body'),
    isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
    helpful: integer('helpful').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('published'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_store_reviews_listing_id_idx').on(table.listingId),
    index('plugin_store_reviews_user_id_idx').on(table.userId),
    index('plugin_store_reviews_rating_idx').on(table.rating),
  ],
);

export const pluginStoreInstalls = pgTable(
  'plugin_store_installs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => pluginStoreListings.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
    uninstalledAt: timestamp('uninstalled_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('plugin_store_installs_listing_id_idx').on(table.listingId),
    index('plugin_store_installs_is_active_idx').on(table.isActive),
  ],
);

// Relations
export const pluginStoreListingsRelations = relations(pluginStoreListings, ({ many }) => ({
  versions: many(pluginStoreVersions),
  reviews: many(pluginStoreReviews),
  installs: many(pluginStoreInstalls),
}));

export const pluginStoreVersionsRelations = relations(pluginStoreVersions, ({ one }) => ({
  listing: one(pluginStoreListings, {
    fields: [pluginStoreVersions.listingId],
    references: [pluginStoreListings.id],
  }),
}));

export const pluginStoreReviewsRelations = relations(pluginStoreReviews, ({ one }) => ({
  listing: one(pluginStoreListings, {
    fields: [pluginStoreReviews.listingId],
    references: [pluginStoreListings.id],
  }),
}));

export const pluginStoreInstallsRelations = relations(pluginStoreInstalls, ({ one }) => ({
  listing: one(pluginStoreListings, {
    fields: [pluginStoreInstalls.listingId],
    references: [pluginStoreListings.id],
  }),
}));
