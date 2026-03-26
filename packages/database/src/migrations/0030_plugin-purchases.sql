-- Plugin purchases, developer payouts, and developer balances
-- Commission system for plugin marketplace (10% ForkCart commission)

CREATE TABLE IF NOT EXISTS "plugin_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "plugin_store_listings"("id") ON DELETE RESTRICT,
  "buyer_id" uuid,
  "price" numeric NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'EUR',
  "commission_rate" numeric NOT NULL DEFAULT '0.10',
  "commission_amount" numeric NOT NULL,
  "developer_amount" numeric NOT NULL,
  "payment_provider" varchar(50) NOT NULL,
  "payment_external_id" varchar(255) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "developer_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "developer_id" uuid NOT NULL REFERENCES "plugin_developers"("id") ON DELETE RESTRICT,
  "amount" numeric NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'EUR',
  "payment_provider" varchar(50),
  "payment_external_id" varchar(255),
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "developer_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "developer_id" uuid NOT NULL REFERENCES "plugin_developers"("id") ON DELETE CASCADE,
  "total_earned" numeric NOT NULL DEFAULT '0',
  "total_commission" numeric NOT NULL DEFAULT '0',
  "total_paid_out" numeric NOT NULL DEFAULT '0',
  "pending_balance" numeric NOT NULL DEFAULT '0',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "plugin_purchases_listing_id_idx" ON "plugin_purchases" ("listing_id");
CREATE INDEX IF NOT EXISTS "plugin_purchases_buyer_id_idx" ON "plugin_purchases" ("buyer_id");
CREATE INDEX IF NOT EXISTS "plugin_purchases_status_idx" ON "plugin_purchases" ("status");
CREATE INDEX IF NOT EXISTS "plugin_purchases_created_at_idx" ON "plugin_purchases" ("created_at");

CREATE INDEX IF NOT EXISTS "developer_payouts_developer_id_idx" ON "developer_payouts" ("developer_id");
CREATE INDEX IF NOT EXISTS "developer_payouts_status_idx" ON "developer_payouts" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "developer_balances_developer_id_idx" ON "developer_balances" ("developer_id");
