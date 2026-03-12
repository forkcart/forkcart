import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    provider: varchar('provider', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    externalId: varchar('external_id', { length: 255 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_order_id_idx').on(table.orderId),
    index('payments_external_id_idx').on(table.externalId),
  ],
);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    amount: integer('amount').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    externalId: varchar('external_id', { length: 255 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('payment_transactions_payment_id_idx').on(table.paymentId)],
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id],
  }),
}));
