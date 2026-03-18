import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * RVS-017: Track per-customer coupon usage to enforce maxUsesPerCustomer.
 */
export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id').notNull(),
    customerId: varchar('customer_id', { length: 255 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('coupon_usages_coupon_customer_idx').on(table.couponId, table.customerId)],
);
