import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/** API keys for programmatic access (agent/integration auth) */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** bcrypt hash of the full key */
    keyHash: text('key_hash').notNull(),
    /** First 8 chars after prefix for display (e.g. "a1b2c3d4") */
    prefix: varchar('prefix', { length: 20 }).notNull(),
    /** Human-readable name */
    name: varchar('name', { length: 255 }).notNull(),
    /** Owner user */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** JSON array of permitted scopes (empty = all) */
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('api_keys_user_id_idx').on(table.userId),
    index('api_keys_prefix_idx').on(table.prefix),
  ],
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));
