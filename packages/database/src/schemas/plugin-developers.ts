import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const pluginDevelopers = pgTable(
  'plugin_developers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    website: text('website'),
    description: text('description'),
    logo: text('logo'),
    verified: boolean('verified').notNull().default(false),
    apiKey: varchar('api_key', { length: 64 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('plugin_developers_user_id_idx').on(table.userId),
    index('plugin_developers_api_key_idx').on(table.apiKey),
  ],
);

export const pluginDevelopersRelations = relations(pluginDevelopers, ({ one }) => ({
  user: one(users, {
    fields: [pluginDevelopers.userId],
    references: [users.id],
  }),
}));
