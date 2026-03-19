-- Product Variants & Attributes tables
-- NOTE: These tables already exist in the database (created by earlier Drizzle push).
-- This migration is a no-op safeguard for fresh installs.

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "sku" varchar(100) UNIQUE,
  "price" integer,
  "inventory_quantity" integer NOT NULL DEFAULT 0,
  "attributes" jsonb NOT NULL DEFAULT '{}',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");

CREATE TABLE IF NOT EXISTS "product_attributes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "type" varchar(50) NOT NULL DEFAULT 'text',
  "values" jsonb NOT NULL DEFAULT '[]',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
