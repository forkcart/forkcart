import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { products } from './products';

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('wishlists_customer_id_idx').on(table.customerId),
    index('wishlists_product_id_idx').on(table.productId),
    unique('wishlists_customer_product_unique').on(table.customerId, table.productId),
  ],
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  customer: one(customers, {
    fields: [wishlists.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));
