-- Auto-update exchange rates from external APIs
ALTER TABLE currencies ADD COLUMN auto_update boolean NOT NULL DEFAULT false;
ALTER TABLE currencies ADD COLUMN last_rate_update timestamptz;
