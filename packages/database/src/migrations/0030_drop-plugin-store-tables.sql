-- Migration 0030: Remove plugin store tables from Core
-- 
-- These tables were created in 0028/0029 but belong in the Developer Portal,
-- not in the self-hosted Core. Core only needs `plugins` (local installs) and
-- `plugin_settings` (local config). All marketplace data (listings, versions,
-- reviews, developers) lives in the central Developer Portal registry.
--
-- This migration cleans up the dead tables.

DROP TABLE IF EXISTS "plugin_store_installs" CASCADE;
DROP TABLE IF EXISTS "plugin_store_reviews" CASCADE;
DROP TABLE IF EXISTS "plugin_store_versions" CASCADE;
DROP TABLE IF EXISTS "plugin_store_listings" CASCADE;
DROP TABLE IF EXISTS "plugin_developers" CASCADE;
