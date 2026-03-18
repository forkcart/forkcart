-- Composite primary key on product_categories junction table
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY ("product_id", "category_id");
--> statement-breakpoint
-- GIN index on product_variants.attributes for JSONB queries
CREATE INDEX "product_variants_attributes_idx" ON "product_variants" USING gin ("attributes");
--> statement-breakpoint
-- CHECK constraint: products.price must be non-negative
ALTER TABLE "products" ADD CONSTRAINT "products_price_non_negative" CHECK ("products"."price" >= 0);
--> statement-breakpoint
-- CHECK constraint: product_variants.price must be non-negative (when not null)
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_non_negative" CHECK ("product_variants"."price" IS NULL OR "product_variants"."price" >= 0);
