import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull().default(0),
  estimatedDays: varchar('estimated_days', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  countries: jsonb('countries').$type<string[]>().notNull().default([]),
  minOrderValue: integer('min_order_value'),
  freeAbove: integer('free_above'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
