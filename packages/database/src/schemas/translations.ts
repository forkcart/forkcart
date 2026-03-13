import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  serial,
  uniqueIndex,
  index,
  decimal,
} from 'drizzle-orm/pg-core';

/** Supported languages */
export const languages = pgTable('languages', {
  locale: varchar('locale', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  nativeName: varchar('native_name', { length: 100 }),
  enabled: boolean('enabled').notNull().default(true),
  completionPct: decimal('completion_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Translation key/value overrides (DB overrides JSON file defaults) */
export const translations = pgTable(
  'translations',
  {
    id: serial('id').primaryKey(),
    locale: varchar('locale', { length: 10 })
      .notNull()
      .references(() => languages.locale, { onDelete: 'cascade' }),
    key: varchar('key', { length: 255 }).notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('translations_locale_key_idx').on(table.locale, table.key),
    index('translations_locale_idx').on(table.locale),
  ],
);
