import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers';
import { products, productVariants } from './products';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    customerId: uuid('customer_id').notNull().references(() => customers.id),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    subtotal: integer('subtotal').notNull().default(0),
    shippingTotal: integer('shipping_total').notNull().default(0),
    taxTotal: integer('tax_total').notNull().default(0),
    discountTotal: integer('discount_total').notNull().default(0),
    total: integer('total').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    shippingAddressId: uuid('shipping_address_id'),
    billingAddressId: uuid('billing_address_id'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_status_idx').on(table.status),
    index('orders_order_number_idx').on(table.orderNumber),
    index('orders_created_at_idx').on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id),
    productName: varchar('product_name', { length: 255 }).notNull(),
    variantName: varchar('variant_name', { length: 255 }),
    sku: varchar('sku', { length: 100 }),
    quantity: integer('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    totalPrice: integer('total_price').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
);

export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: varchar('from_status', { length: 20 }),
    toStatus: varchar('to_status', { length: 20 }).notNull(),
    note: text('note'),
    changedBy: uuid('changed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('order_status_history_order_id_idx').on(table.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));
