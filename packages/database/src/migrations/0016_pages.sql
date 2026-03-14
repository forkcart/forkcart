-- Pages table
CREATE TABLE IF NOT EXISTS "pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "content" jsonb,
  "seo_title" varchar(255),
  "seo_description" text,
  "is_homepage" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "published_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "pages_slug_idx" ON "pages" ("slug");
CREATE INDEX IF NOT EXISTS "pages_status_idx" ON "pages" ("status");
CREATE INDEX IF NOT EXISTS "pages_is_homepage_idx" ON "pages" ("is_homepage");

-- Page translations table
CREATE TABLE IF NOT EXISTS "page_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "pages"("id") ON DELETE CASCADE,
  "locale" varchar(10) NOT NULL,
  "title" varchar(255),
  "content" jsonb,
  "seo_title" varchar(255),
  "seo_description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "page_translations_page_locale_idx" ON "page_translations" ("page_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_page_translations_page" ON "page_translations" ("page_id");
CREATE INDEX IF NOT EXISTS "idx_page_translations_locale" ON "page_translations" ("locale");
