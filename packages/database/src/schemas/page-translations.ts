import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pages } from './pages';

export const pageTranslations = pgTable(
  'page_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 10 }).notNull(),
    title: varchar('title', { length: 255 }),
    content: jsonb('content'),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('page_translations_page_locale_idx').on(table.pageId, table.locale),
    index('idx_page_translations_page').on(table.pageId),
    index('idx_page_translations_locale').on(table.locale),
  ],
);

export const pageTranslationsRelations = relations(pageTranslations, ({ one }) => ({
  page: one(pages, {
    fields: [pageTranslations.pageId],
    references: [pages.id],
  }),
}));
