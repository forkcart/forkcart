import { pgTable, uuid, varchar, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    alt: varchar('alt', { length: 255 }),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('media_entity_idx').on(table.entityType, table.entityId),
  ],
);
