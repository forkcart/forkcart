import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { media } from './media';

/**
 * Mobile app configuration — singleton pattern.
 * Stores the app builder settings for generating mobile apps.
 */
export const mobileAppConfig = pgTable('mobile_app_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  appName: varchar('app_name', { length: 100 }).notNull().default('My Store'),
  appSlug: varchar('app_slug', { length: 100 }).notNull().default('my-store'),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#000000'),
  accentColor: varchar('accent_color', { length: 7 }).notNull().default('#FF6B00'),
  backgroundColor: varchar('background_color', { length: 7 }).notNull().default('#FFFFFF'),
  iconMediaId: uuid('icon_media_id').references(() => media.id),
  splashMediaId: uuid('splash_media_id').references(() => media.id),
  apiUrl: varchar('api_url', { length: 500 }).notNull().default(''),
  bundleId: varchar('bundle_id', { length: 200 }).default(''),
  androidPackage: varchar('android_package', { length: 200 }).default(''),
  buildMode: varchar('build_mode', { length: 20 }).notNull().default('casual'),
  lastBuildAt: timestamp('last_build_at', { withTimezone: true }),
  lastBuildStatus: varchar('last_build_status', { length: 20 }),
  lastBuildUrl: text('last_build_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
