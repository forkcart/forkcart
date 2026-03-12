import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { customers } from './customers';

/** Search query analytics — tracks what users search for */
export const searchQueries = pgTable(
  'search_queries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    query: text('query').notNull(),
    resultsCount: integer('results_count').notNull().default(0),
    clickedProductId: uuid('clicked_product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    sessionId: text('session_id'),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    searchMode: varchar('search_mode', { length: 20 }).notNull().default('basic'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('search_queries_query_idx').on(table.query),
    index('search_queries_created_at_idx').on(table.createdAt),
    index('search_queries_results_count_idx').on(table.resultsCount),
  ],
);
