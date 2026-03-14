-- Add page_type column to pages table for system page identification
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "page_type" varchar(30) DEFAULT 'custom';
CREATE INDEX IF NOT EXISTS "pages_page_type_idx" ON "pages" ("page_type");
