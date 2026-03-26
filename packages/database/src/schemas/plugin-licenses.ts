import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pluginPurchases } from './plugin-purchases';
import { pluginStoreListings } from './plugin-store';

export const pluginLicenses = pgTable(
  'plugin_licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => pluginPurchases.id, { onDelete: 'restrict' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => pluginStoreListings.id, { onDelete: 'restrict' }),
    licenseKey: varchar('license_key', { length: 64 }).notNull().unique(),
    domain: varchar('domain', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_licenses_purchase_id_idx').on(table.purchaseId),
    index('plugin_licenses_listing_id_idx').on(table.listingId),
    index('plugin_licenses_status_idx').on(table.status),
    uniqueIndex('plugin_licenses_license_key_idx').on(table.licenseKey),
  ],
);

// Relations
export const pluginLicensesRelations = relations(pluginLicenses, ({ one }) => ({
  purchase: one(pluginPurchases, {
    fields: [pluginLicenses.purchaseId],
    references: [pluginPurchases.id],
  }),
  listing: one(pluginStoreListings, {
    fields: [pluginLicenses.listingId],
    references: [pluginStoreListings.id],
  }),
}));
