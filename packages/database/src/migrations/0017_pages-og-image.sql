-- Add og_image column to pages table
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "og_image" varchar(500);
