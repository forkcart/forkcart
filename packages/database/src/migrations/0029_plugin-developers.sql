-- Plugin Developers: Developer accounts for the Plugin Marketplace

CREATE TABLE IF NOT EXISTS "plugin_developers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "company_name" varchar(255) NOT NULL,
  "website" text,
  "description" text,
  "logo" text,
  "verified" boolean NOT NULL DEFAULT false,
  "api_key" varchar(64) NOT NULL UNIQUE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "plugin_developers_user_id_idx" ON "plugin_developers" ("user_id");
CREATE INDEX IF NOT EXISTS "plugin_developers_api_key_idx" ON "plugin_developers" ("api_key");

-- Add developer_id to plugin_store_listings
ALTER TABLE "plugin_store_listings" ADD COLUMN IF NOT EXISTS "developer_id" uuid REFERENCES "plugin_developers"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "plugin_store_listings_developer_id_idx" ON "plugin_store_listings" ("developer_id");

-- Add zip_path to plugin_store_versions for ZIP storage
ALTER TABLE "plugin_store_versions" ADD COLUMN IF NOT EXISTS "zip_path" text;
