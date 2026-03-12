-- Drop old columns from shipping_methods
ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "carrier";
ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "max_order_amount";
ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "min_order_amount";
ALTER TABLE "shipping_methods" DROP COLUMN IF EXISTS "metadata";

-- Change estimated_days from integer to varchar
ALTER TABLE "shipping_methods" ALTER COLUMN "estimated_days" TYPE varchar(20) USING "estimated_days"::varchar;

-- Add new columns
ALTER TABLE "shipping_methods" ADD COLUMN IF NOT EXISTS "countries" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "shipping_methods" ADD COLUMN IF NOT EXISTS "min_order_value" integer;
ALTER TABLE "shipping_methods" ADD COLUMN IF NOT EXISTS "free_above" integer;

-- Drop shipping_zones table (countries now stored directly on shipping_methods)
DROP TABLE IF EXISTS "shipping_zones";
