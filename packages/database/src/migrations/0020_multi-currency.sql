-- Multi-Currency support: currencies table + product_prices table

CREATE TABLE IF NOT EXISTS "currencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(3) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "symbol" varchar(10) NOT NULL,
  "decimal_places" integer NOT NULL DEFAULT 2,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "exchange_rate" integer NOT NULL DEFAULT 100000,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "currencies_code_idx" ON "currencies" ("code");
CREATE INDEX IF NOT EXISTS "currencies_is_active_idx" ON "currencies" ("is_active");

CREATE TABLE IF NOT EXISTS "product_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "currency_code" varchar(3) NOT NULL,
  "price" integer NOT NULL,
  "compare_at_price" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_prices_product_currency_idx" ON "product_prices" ("product_id", "currency_code");
CREATE INDEX IF NOT EXISTS "product_prices_product_id_idx" ON "product_prices" ("product_id");
CREATE INDEX IF NOT EXISTS "product_prices_currency_code_idx" ON "product_prices" ("currency_code");

-- Add currency columns to orders for multi-currency accounting
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "display_currency" varchar(3) DEFAULT 'EUR';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "display_total" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "exchange_rate_used" integer;

-- Seed default currencies (exchange_rate is stored as integer with 5 decimal precision: 100000 = 1.00000)
INSERT INTO "currencies" ("code", "name", "symbol", "decimal_places", "is_default", "is_active", "exchange_rate")
VALUES
  ('EUR', 'Euro', '€', 2, true, true, 100000),
  ('USD', 'US Dollar', '$', 2, false, true, 108500),
  ('GBP', 'British Pound', '£', 2, false, true, 85700),
  ('CHF', 'Swiss Franc', 'Fr.', 2, false, true, 96300)
ON CONFLICT ("code") DO NOTHING;
