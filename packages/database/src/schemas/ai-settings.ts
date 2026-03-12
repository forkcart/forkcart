import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * AI settings — stores the active AI provider configuration.
 * Only one row should exist (singleton pattern). The API enforces this via upsert.
 */
export const aiSettings = pgTable('ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'openai' | 'anthropic' | 'gemini' | 'openrouter'
  apiKey: text('api_key').notNull(), // encrypted in a real deployment
  model: varchar('model', { length: 255 }), // optional override
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
