import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pluginStoreListings } from './plugin-store';
import { pluginDevelopers } from './plugin-developers';

export const pluginPurchases = pgTable(
  'plugin_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => pluginStoreListings.id, { onDelete: 'restrict' }),
    buyerId: uuid('buyer_id'),
    price: numeric('price').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    commissionRate: numeric('commission_rate').notNull().default('0.10'),
    commissionAmount: numeric('commission_amount').notNull(),
    developerAmount: numeric('developer_amount').notNull(),
    paymentProvider: varchar('payment_provider', { length: 50 }).notNull(),
    paymentExternalId: varchar('payment_external_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_purchases_listing_id_idx').on(table.listingId),
    index('plugin_purchases_buyer_id_idx').on(table.buyerId),
    index('plugin_purchases_status_idx').on(table.status),
    index('plugin_purchases_created_at_idx').on(table.createdAt),
  ],
);

export const developerPayouts = pgTable(
  'developer_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    developerId: uuid('developer_id')
      .notNull()
      .references(() => pluginDevelopers.id, { onDelete: 'restrict' }),
    amount: numeric('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    paymentProvider: varchar('payment_provider', { length: 50 }),
    paymentExternalId: varchar('payment_external_id', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('developer_payouts_developer_id_idx').on(table.developerId),
    index('developer_payouts_status_idx').on(table.status),
  ],
);

export const developerBalances = pgTable(
  'developer_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    developerId: uuid('developer_id')
      .notNull()
      .references(() => pluginDevelopers.id, { onDelete: 'cascade' }),
    totalEarned: numeric('total_earned').notNull().default('0'),
    totalCommission: numeric('total_commission').notNull().default('0'),
    totalPaidOut: numeric('total_paid_out').notNull().default('0'),
    pendingBalance: numeric('pending_balance').notNull().default('0'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('developer_balances_developer_id_idx').on(table.developerId)],
);

// Relations
export const pluginPurchasesRelations = relations(pluginPurchases, ({ one }) => ({
  listing: one(pluginStoreListings, {
    fields: [pluginPurchases.listingId],
    references: [pluginStoreListings.id],
  }),
}));

export const developerPayoutsRelations = relations(developerPayouts, ({ one }) => ({
  developer: one(pluginDevelopers, {
    fields: [developerPayouts.developerId],
    references: [pluginDevelopers.id],
  }),
}));

export const developerBalancesRelations = relations(developerBalances, ({ one }) => ({
  developer: one(pluginDevelopers, {
    fields: [developerBalances.developerId],
    references: [pluginDevelopers.id],
  }),
}));
