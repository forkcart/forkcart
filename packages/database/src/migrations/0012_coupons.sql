-- 0012_coupons.sql
CREATE TABLE IF NOT EXISTS "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "type" varchar(20) NOT NULL,
  "value" integer NOT NULL DEFAULT 0,
  "min_order_amount" integer,
  "max_uses" integer,
  "used_count" integer NOT NULL DEFAULT 0,
  "max_uses_per_customer" integer,
  "starts_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons" ("code");
CREATE INDEX IF NOT EXISTS "coupons_enabled_idx" ON "coupons" ("enabled");
