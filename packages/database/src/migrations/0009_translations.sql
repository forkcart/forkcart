-- i18n: languages + translation overrides

CREATE TABLE IF NOT EXISTS "languages" (
  "locale" VARCHAR(10) PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "native_name" VARCHAR(100),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "completion_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "translations" (
  "id" SERIAL PRIMARY KEY,
  "locale" VARCHAR(10) NOT NULL REFERENCES "languages"("locale") ON DELETE CASCADE,
  "key" VARCHAR(255) NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "translations_locale_key_idx" ON "translations" ("locale", "key");
CREATE INDEX IF NOT EXISTS "translations_locale_idx" ON "translations" ("locale");

-- Seed default languages
INSERT INTO "languages" ("locale", "name", "native_name", "enabled", "completion_pct")
VALUES
  ('en', 'English', 'English', true, 100),
  ('de', 'German', 'Deutsch', true, 100)
ON CONFLICT ("locale") DO NOTHING;
