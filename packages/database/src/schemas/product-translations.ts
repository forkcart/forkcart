import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(),
    name: varchar('name', { length: 255 }),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_translations_product_locale_idx').on(table.productId, table.locale),
    index('idx_product_translations_product').on(table.productId),
    index('idx_product_translations_locale').on(table.locale),
  ],
);
