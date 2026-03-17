import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';
import { categories } from './categories';
import { orders } from './orders';

export const marketplaceConnections = pgTable(
  'marketplace_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marketplaceId: varchar('marketplace_id', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    settings: jsonb('settings').notNull().default({}),
    status: varchar('status', { length: 20 }).notNull().default('disconnected'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('marketplace_connections_marketplace_id_idx').on(table.marketplaceId)],
);

export const marketplaceListings = pgTable(
  'marketplace_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    marketplaceId: varchar('marketplace_id', { length: 50 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    externalUrl: text('external_url'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('marketplace_listings_product_id_idx').on(table.productId),
    index('marketplace_listings_marketplace_id_idx').on(table.marketplaceId),
    uniqueIndex('marketplace_listings_external_id_marketplace_idx').on(
      table.externalId,
      table.marketplaceId,
    ),
  ],
);

export const marketplaceOrders = pgTable(
  'marketplace_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    marketplaceId: varchar('marketplace_id', { length: 50 }).notNull(),
    orderData: jsonb('order_data').notNull(),
    forkcartOrderId: uuid('forkcart_order_id').references(() => orders.id),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('marketplace_orders_external_id_marketplace_idx').on(
      table.externalId,
      table.marketplaceId,
    ),
    index('marketplace_orders_marketplace_id_idx').on(table.marketplaceId),
    index('marketplace_orders_forkcart_order_id_idx').on(table.forkcartOrderId),
  ],
);

export const marketplaceCategoryMappings = pgTable(
  'marketplace_category_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    marketplaceId: varchar('marketplace_id', { length: 50 }).notNull(),
    externalCategoryId: varchar('external_category_id', { length: 255 }).notNull(),
    externalCategoryName: varchar('external_category_name', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('marketplace_category_mappings_category_id_idx').on(table.categoryId),
    uniqueIndex('marketplace_category_mappings_unique_idx').on(
      table.categoryId,
      table.marketplaceId,
    ),
  ],
);

export const marketplaceSyncLogs = pgTable(
  'marketplace_sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    marketplaceId: varchar('marketplace_id', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('marketplace_sync_logs_marketplace_id_idx').on(table.marketplaceId),
    index('marketplace_sync_logs_created_at_idx').on(table.createdAt),
  ],
);

// Relations
export const marketplaceConnectionsRelations = relations(marketplaceConnections, () => ({}));

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  product: one(products, {
    fields: [marketplaceListings.productId],
    references: [products.id],
  }),
}));

export const marketplaceOrdersRelations = relations(marketplaceOrders, ({ one }) => ({
  forkcartOrder: one(orders, {
    fields: [marketplaceOrders.forkcartOrderId],
    references: [orders.id],
  }),
}));

export const marketplaceCategoryMappingsRelations = relations(
  marketplaceCategoryMappings,
  ({ one }) => ({
    category: one(categories, {
      fields: [marketplaceCategoryMappings.categoryId],
      references: [categories.id],
    }),
  }),
);

export const marketplaceSyncLogsRelations = relations(marketplaceSyncLogs, () => ({}));
