import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** Tax Classes — categorize products by tax treatment (Standard, Reduced, Zero) */
export const taxClasses = pgTable('tax_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Tax Zones — geographic regions for tax calculation */
export const taxZones = pgTable('tax_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  /** JSON array of 2-letter country codes, e.g. ["DE","AT","CH"] */
  countries: jsonb('countries').notNull().default([]),
  /** JSON array of state/province codes, e.g. ["DE-BY","US-CA"] */
  states: jsonb('states').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Tax Rules — rate matrix linking class × zone with priority and compound support */
export const taxRules = pgTable(
  'tax_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    taxClassId: uuid('tax_class_id').references(() => taxClasses.id, { onDelete: 'cascade' }),
    taxZoneId: uuid('tax_zone_id').references(() => taxZones.id, { onDelete: 'cascade' }),
    /** Legacy fields kept for backward compat — prefer zone-based matching */
    country: varchar('country', { length: 2 }),
    state: varchar('state', { length: 100 }),
    /** Tax rate as decimal string, e.g. "0.19" for 19% */
    rate: decimal('rate', { precision: 8, scale: 5 }).notNull(),
    /** Higher priority wins when multiple rules match */
    priority: integer('priority').notNull().default(0),
    /** Tax type label, e.g. "VAT", "GST", "Sales Tax" */
    taxType: varchar('tax_type', { length: 50 }).notNull().default('VAT'),
    /** Compound = tax calculated on top of other taxes */
    isCompound: boolean('is_compound').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tax_rules_class_zone_idx').on(table.taxClassId, table.taxZoneId),
    index('tax_rules_country_idx').on(table.country),
    index('tax_rules_priority_idx').on(table.priority),
  ],
);

/** Tax Settings — global store-level tax configuration */
export const taxSettings = pgTable('tax_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** "inclusive" (EU style, price includes tax) or "exclusive" (US style, tax added on top) */
  taxDisplay: varchar('tax_display', { length: 20 }).notNull().default('inclusive'),
  /** Default tax class for new products */
  defaultTaxClassId: uuid('default_tax_class_id').references(() => taxClasses.id),
  /** Whether catalog prices are entered with tax included */
  pricesEnteredWithTax: boolean('prices_entered_with_tax').notNull().default(true),
  /** Enable VAT ID validation for B2B reverse charge */
  enableVatValidation: boolean('enable_vat_validation').notNull().default(false),
  /** Default country for tax calculation when no address is known */
  defaultCountry: varchar('default_country', { length: 2 }).notNull().default('DE'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const taxClassesRelations = relations(taxClasses, ({ many }) => ({
  rules: many(taxRules),
}));

export const taxZonesRelations = relations(taxZones, ({ many }) => ({
  rules: many(taxRules),
}));

export const taxRulesRelations = relations(taxRules, ({ one }) => ({
  taxClass: one(taxClasses, {
    fields: [taxRules.taxClassId],
    references: [taxClasses.id],
  }),
  taxZone: one(taxZones, {
    fields: [taxRules.taxZoneId],
    references: [taxZones.id],
  }),
}));
