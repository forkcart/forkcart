CREATE TABLE IF NOT EXISTS "plugin_licenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "purchase_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "license_key" varchar(64) NOT NULL,
  "domain" varchar(255),
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plugin_licenses_license_key_unique" UNIQUE("license_key")
);
--> statement-breakpoint
ALTER TABLE "plugin_licenses" ADD CONSTRAINT "plugin_licenses_purchase_id_plugin_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."plugin_purchases"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plugin_licenses" ADD CONSTRAINT "plugin_licenses_listing_id_plugin_store_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."plugin_store_listings"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plugin_licenses_purchase_id_idx" ON "plugin_licenses" USING btree ("purchase_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plugin_licenses_listing_id_idx" ON "plugin_licenses" USING btree ("listing_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plugin_licenses_status_idx" ON "plugin_licenses" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plugin_licenses_license_key_idx" ON "plugin_licenses" USING btree ("license_key");
