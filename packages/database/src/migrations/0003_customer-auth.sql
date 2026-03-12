-- Customer auth: add password reset fields
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_reset_token" varchar(255);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_reset_expires" timestamp with time zone;
