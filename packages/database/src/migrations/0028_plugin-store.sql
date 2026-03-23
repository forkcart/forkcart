-- Plugin Store: App marketplace for ForkCart plugins

CREATE TABLE IF NOT EXISTS "plugin_store_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "package_name" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "short_description" varchar(500),
  "author" varchar(255),
  "author_url" text,
  "version" varchar(50) NOT NULL,
  "type" varchar(50) NOT NULL DEFAULT 'other',
  "category" varchar(100),
  "icon" text,
  "screenshots" jsonb DEFAULT '[]',
  "readme" text,
  "pricing" varchar(20) NOT NULL DEFAULT 'free',
  "price" numeric,
  "currency" varchar(3) NOT NULL DEFAULT 'EUR',
  "downloads" integer NOT NULL DEFAULT 0,
  "rating" numeric,
  "rating_count" integer NOT NULL DEFAULT 0,
  "tags" jsonb DEFAULT '[]',
  "requirements" jsonb DEFAULT '{}',
  "repository" text,
  "license" varchar(100),
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "is_featured" boolean NOT NULL DEFAULT false,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plugin_store_listings_type_idx" ON "plugin_store_listings" ("type");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_category_idx" ON "plugin_store_listings" ("category");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_status_idx" ON "plugin_store_listings" ("status");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_pricing_idx" ON "plugin_store_listings" ("pricing");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_is_featured_idx" ON "plugin_store_listings" ("is_featured");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_downloads_idx" ON "plugin_store_listings" ("downloads");
CREATE INDEX IF NOT EXISTS "plugin_store_listings_rating_idx" ON "plugin_store_listings" ("rating");

CREATE TABLE IF NOT EXISTS "plugin_store_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "plugin_store_listings"("id") ON DELETE CASCADE,
  "version" varchar(50) NOT NULL,
  "package_name" varchar(255) NOT NULL,
  "changelog" text,
  "min_forkcart_version" varchar(50),
  "size" integer,
  "downloads" integer NOT NULL DEFAULT 0,
  "status" varchar(20) NOT NULL DEFAULT 'published',
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plugin_store_versions_listing_id_idx" ON "plugin_store_versions" ("listing_id");
CREATE UNIQUE INDEX IF NOT EXISTS "plugin_store_versions_listing_version_idx" ON "plugin_store_versions" ("listing_id", "version");

CREATE TABLE IF NOT EXISTS "plugin_store_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "plugin_store_listings"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "title" varchar(255),
  "body" text,
  "is_verified_purchase" boolean NOT NULL DEFAULT false,
  "helpful" integer NOT NULL DEFAULT 0,
  "status" varchar(20) NOT NULL DEFAULT 'published',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plugin_store_reviews_listing_id_idx" ON "plugin_store_reviews" ("listing_id");
CREATE INDEX IF NOT EXISTS "plugin_store_reviews_user_id_idx" ON "plugin_store_reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "plugin_store_reviews_rating_idx" ON "plugin_store_reviews" ("rating");

CREATE TABLE IF NOT EXISTS "plugin_store_installs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "plugin_store_listings"("id") ON DELETE CASCADE,
  "version" varchar(50) NOT NULL,
  "installed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "uninstalled_at" timestamp with time zone,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS "plugin_store_installs_listing_id_idx" ON "plugin_store_installs" ("listing_id");
CREATE INDEX IF NOT EXISTS "plugin_store_installs_is_active_idx" ON "plugin_store_installs" ("is_active");
