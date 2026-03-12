-- Tax Classes table
CREATE TABLE "tax_classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Tax Zones table
CREATE TABLE "tax_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "states" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Tax Settings table
CREATE TABLE "tax_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tax_display" varchar(20) DEFAULT 'inclusive' NOT NULL,
  "default_tax_class_id" uuid REFERENCES "tax_classes"("id"),
  "prices_entered_with_tax" boolean DEFAULT true NOT NULL,
  "enable_vat_validation" boolean DEFAULT false NOT NULL,
  "default_country" varchar(2) DEFAULT 'DE' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Alter tax_rules: add tax_class_id, tax_zone_id, change rate to decimal, add priority/taxType/isCompound
-- First add new columns
ALTER TABLE "tax_rules" ADD COLUMN "tax_class_id" uuid REFERENCES "tax_classes"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tax_rules" ADD COLUMN "tax_zone_id" uuid REFERENCES "tax_zones"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tax_rules" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tax_rules" ADD COLUMN "tax_type" varchar(50) DEFAULT 'VAT' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tax_rules" ADD COLUMN "is_compound" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Convert rate from integer (1900 = 19%) to decimal (0.19000)
ALTER TABLE "tax_rules" ALTER COLUMN "rate" TYPE numeric(8,5) USING (rate::numeric / 10000);
--> statement-breakpoint
-- Add taxClassId to products
ALTER TABLE "products" ADD COLUMN "tax_class_id" uuid REFERENCES "tax_classes"("id");
--> statement-breakpoint
-- Add tax breakdown to orders
ALTER TABLE "orders" ADD COLUMN "tax_breakdown" jsonb;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_inclusive" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
-- Indexes
CREATE INDEX "tax_rules_class_zone_idx" ON "tax_rules" ("tax_class_id", "tax_zone_id");
--> statement-breakpoint
CREATE INDEX "tax_rules_country_idx" ON "tax_rules" ("country");
--> statement-breakpoint
CREATE INDEX "tax_rules_priority_idx" ON "tax_rules" ("priority");
