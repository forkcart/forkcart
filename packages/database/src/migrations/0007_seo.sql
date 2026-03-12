-- SEO: Add meta fields to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_title" varchar(255);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_description" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_keywords" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "og_image" text;

-- SEO: Add auto-generated alt text to media
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt_auto" text;

-- SEO: Settings key-value store
CREATE TABLE IF NOT EXISTS "seo_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(255) NOT NULL UNIQUE,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default SEO settings
INSERT INTO "seo_settings" ("key", "value") VALUES
  ('shop_name', 'ForkCart Shop'),
  ('default_description_template', '{productName} - {shortDescription}. Jetzt bestellen. ✓ Schneller Versand ✓ Sichere Zahlung')
ON CONFLICT ("key") DO NOTHING;
