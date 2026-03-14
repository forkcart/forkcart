-- 0014_wishlists.sql
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wishlists_customer_product_unique" UNIQUE("customer_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "wishlists_customer_id_idx" ON "wishlists" ("customer_id");
CREATE INDEX IF NOT EXISTS "wishlists_product_id_idx" ON "wishlists" ("product_id");
