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
import { relations } from 'drizzle-orm';

export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  carrier: varchar('carrier', { length: 100 }),
  price: integer('price').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  minOrderAmount: integer('min_order_amount'),
  maxOrderAmount: integer('max_order_amount'),
  estimatedDays: integer('estimated_days'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  countries: jsonb('countries').notNull().default([]),
  shippingMethodId: uuid('shipping_method_id')
    .notNull()
    .references(() => shippingMethods.id, { onDelete: 'cascade' }),
  priceOverride: integer('price_override'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shippingMethodsRelations = relations(shippingMethods, ({ many }) => ({
  zones: many(shippingZones),
}));

export const shippingZonesRelations = relations(shippingZones, ({ one }) => ({
  method: one(shippingMethods, {
    fields: [shippingZones.shippingMethodId],
    references: [shippingMethods.id],
  }),
}));
