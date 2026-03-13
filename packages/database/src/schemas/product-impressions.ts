import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';

/** Product impressions for smart ranking & trending */
export const productImpressions = pgTable(
  'product_impressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 20 }).notNull(),
    sessionId: text('session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_impressions_product_event_created_idx').on(
      table.productId,
      table.eventType,
      table.createdAt,
    ),
    index('product_impressions_created_at_idx').on(table.createdAt),
    index('product_impressions_event_type_idx').on(table.eventType),
  ],
);
