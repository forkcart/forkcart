import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 100 }).notNull(),
  to: varchar('to', { length: 500 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  template: varchar('template', { length: 100 }).notNull(),
  messageId: varchar('message_id', { length: 500 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('sent'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});
