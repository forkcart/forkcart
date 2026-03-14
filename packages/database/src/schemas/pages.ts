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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    content: jsonb('content'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    isHomepage: boolean('is_homepage').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('pages_slug_idx').on(table.slug),
    index('pages_status_idx').on(table.status),
    index('pages_is_homepage_idx').on(table.isHomepage),
  ],
);

export const pagesRelations = relations(pages, ({ many }) => ({
  translations: many(pageTranslations),
}));

import { pageTranslations } from './page-translations';
