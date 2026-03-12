import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const plugins = pgTable('plugins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  version: varchar('version', { length: 50 }).notNull(),
  description: text('description'),
  author: varchar('author', { length: 255 }),
  isActive: boolean('is_active').notNull().default(false),
  entryPoint: varchar('entry_point', { length: 500 }),
  metadata: jsonb('metadata'),
  installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pluginSettings = pgTable('plugin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  pluginId: uuid('plugin_id').notNull().references(() => plugins.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pluginsRelations = relations(plugins, ({ many }) => ({
  settings: many(pluginSettings),
}));

export const pluginSettingsRelations = relations(pluginSettings, ({ one }) => ({
  plugin: one(plugins, {
    fields: [pluginSettings.pluginId],
    references: [plugins.id],
  }),
}));
