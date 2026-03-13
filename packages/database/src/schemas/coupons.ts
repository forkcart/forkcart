import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    type: varchar('type', { length: 20 }).notNull(), // 'percentage' | 'fixed_amount' | 'free_shipping'
    value: integer('value').notNull().default(0),
    minOrderAmount: integer('min_order_amount'),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    maxUsesPerCustomer: integer('max_uses_per_customer'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('coupons_code_idx').on(table.code),
    index('coupons_enabled_idx').on(table.enabled),
  ],
);
