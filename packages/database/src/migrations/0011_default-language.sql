-- Add isDefault column to languages table
ALTER TABLE languages ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Set English as default (if it exists)
UPDATE languages SET is_default = true WHERE locale = 'en';
