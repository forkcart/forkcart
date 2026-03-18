-- Cookie Consent i18n: Add locale support to settings

-- Add locale column (nullable = applies to all locales / legacy default)
ALTER TABLE "cookie_consent_settings" ADD COLUMN IF NOT EXISTS "locale" varchar(10);

-- Drop old unique constraint on key only
ALTER TABLE "cookie_consent_settings" DROP CONSTRAINT IF EXISTS "cookie_consent_settings_key_unique";

-- Add new unique constraint on (key, locale)
ALTER TABLE "cookie_consent_settings" ADD CONSTRAINT "cookie_consent_settings_key_locale_unique" UNIQUE ("key", "locale");

-- Migrate existing settings: set locale to 'de' (they were all German)
UPDATE "cookie_consent_settings" SET "locale" = 'de' WHERE "locale" IS NULL;
