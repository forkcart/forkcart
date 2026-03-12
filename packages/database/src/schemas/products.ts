import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { categories } from './categories';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    sku: varchar('sku', { length: 100 }).unique(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    price: integer('price').notNull().default(0),
    compareAtPrice: integer('compare_at_price'),
    costPrice: integer('cost_price'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    trackInventory: boolean('track_inventory').notNull().default(true),
    inventoryQuantity: integer('inventory_quantity').notNull().default(0),
    weight: integer('weight'),
    weightUnit: varchar('weight_unit', { length: 5 }).notNull().default('g'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_slug_idx').on(table.slug),
    index('products_status_idx').on(table.status),
    index('products_sku_idx').on(table.sku),
    index('products_created_at_idx').on(table.createdAt),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 100 }).unique(),
    price: integer('price'),
    inventoryQuantity: integer('inventory_quantity').notNull().default(0),
    attributes: jsonb('attributes').notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('product_variants_product_id_idx').on(table.productId)],
);

export const productAttributes = pgTable('product_attributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull().default('text'),
  values: jsonb('values').notNull().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Junction table for products ↔ categories */
export const productCategories = pgTable('product_categories', {
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
});

/** Relations */
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  productCategories: many(productCategories),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));
