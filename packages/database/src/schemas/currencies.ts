import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 3 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    symbol: varchar('symbol', { length: 10 }).notNull(),
    decimalPlaces: integer('decimal_places').notNull().default(2),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    /** Exchange rate relative to the default currency (1 default = X this currency) */
    exchangeRate: integer('exchange_rate').notNull().default(100000),
    /** Whether the exchange rate should be auto-updated from external APIs */
    autoUpdate: boolean('auto_update').notNull().default(false),
    /** When the exchange rate was last automatically updated */
    lastRateUpdate: timestamp('last_rate_update', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('currencies_code_idx').on(table.code),
    index('currencies_is_active_idx').on(table.isActive),
  ],
);

export const productPrices = pgTable(
  'product_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    /** Price in the smallest unit of the currency (cents) */
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_prices_product_currency_idx').on(table.productId, table.currencyCode),
    index('product_prices_product_id_idx').on(table.productId),
    index('product_prices_currency_code_idx').on(table.currencyCode),
  ],
);

/** Relations */
export const currenciesRelations = relations(currencies, ({ many }) => ({
  productPrices: many(productPrices),
}));

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}));
