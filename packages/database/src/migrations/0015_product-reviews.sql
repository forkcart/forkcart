-- 0015_product-reviews.sql
CREATE TABLE IF NOT EXISTS "product_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "title" varchar(255),
  "content" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_reviews_product_id_idx" ON "product_reviews" ("product_id");
CREATE INDEX IF NOT EXISTS "product_reviews_customer_id_idx" ON "product_reviews" ("customer_id");
CREATE INDEX IF NOT EXISTS "product_reviews_status_idx" ON "product_reviews" ("status");
