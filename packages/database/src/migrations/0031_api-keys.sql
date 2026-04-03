-- Migration 0031: API Keys for programmatic/agent access
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key_hash" text NOT NULL,
  "prefix" varchar(20) NOT NULL,
  "name" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "last_used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_prefix_idx" ON "api_keys" ("prefix");
