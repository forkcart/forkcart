import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { customers } from './customers';

/** Chat session messages type */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProductRef[];
  timestamp: string;
}

/** Product reference in chat messages */
export interface ChatProductRef {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
}

/** Chat sessions — stores conversation history */
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id),
  sessionId: text('session_id'),
  messages: jsonb('messages').$type<ChatMessage[]>().notNull().default([]),
  messageCount: integer('message_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Chatbot settings — key/value configuration */
export const chatbotSettings = pgTable('chatbot_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
