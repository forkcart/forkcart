import { sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { createLogger } from '../lib/logger';

const logger = createLogger('license-service');

/**
 * plugin_licenses table shape (created by another bee's migration):
 *   id            uuid PK
 *   purchase_id   uuid NOT NULL
 *   listing_id    uuid NOT NULL
 *   license_key   varchar NOT NULL UNIQUE
 *   domain        varchar NULL
 *   status        varchar NOT NULL DEFAULT 'active'   — active | revoked | expired
 *   expires_at    timestamp NULL
 *   created_at    timestamp NOT NULL DEFAULT now()
 *   updated_at    timestamp NOT NULL DEFAULT now()
 *
 * We use raw SQL via drizzle's `sql` tag because the schema file
 * is being landed by a sibling bee and isn't importable yet.
 */

export interface LicenseRow {
  id: string;
  purchase_id: string;
  listing_id: string;
  license_key: string;
  domain: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseVerifyResult {
  valid: boolean;
  plugin: string | null;
  expiresAt: string | null;
  reason?: string;
}

export interface LicenseServiceDeps {
  db: Database;
}

export class LicenseService {
  private db: Database;

  constructor(deps: LicenseServiceDeps) {
    this.db = deps.db;
  }

  // ─── Core verification ──────────────────────────────────────────────────

  /**
   * Verify a license key. Optionally binds to a domain on first use.
   * Designed to be FAST — single indexed query.
   */
  async verifyLicense(licenseKey: string, domain?: string): Promise<LicenseVerifyResult> {
    const rows = await this.db.execute(
      sql`SELECT pl.*, psl.slug AS plugin_slug
          FROM plugin_licenses pl
          JOIN plugin_store_listings psl ON psl.id = pl.listing_id
          WHERE pl.license_key = ${licenseKey}
          LIMIT 1`,
    );

    const license = (rows as unknown as Array<LicenseRow & { plugin_slug: string }>)[0];
    if (!license) {
      return { valid: false, plugin: null, expiresAt: null, reason: 'LICENSE_NOT_FOUND' };
    }

    // Check status
    if (license.status === 'revoked') {
      return {
        valid: false,
        plugin: license.plugin_slug,
        expiresAt: null,
        reason: 'LICENSE_REVOKED',
      };
    }

    // Check expiry
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return {
        valid: false,
        plugin: license.plugin_slug,
        expiresAt: license.expires_at,
        reason: 'LICENSE_EXPIRED',
      };
    }

    // Domain binding: if no domain set yet, bind on first use
    if (domain && !license.domain) {
      await this.db.execute(
        sql`UPDATE plugin_licenses
            SET domain = ${domain}, updated_at = NOW()
            WHERE id = ${license.id}`,
      );
      logger.info(
        { licenseKey: licenseKey.slice(0, 8) + '...', domain },
        'License bound to domain',
      );
    }

    // If domain is set and doesn't match, reject
    if (domain && license.domain && license.domain !== domain) {
      return {
        valid: false,
        plugin: license.plugin_slug,
        expiresAt: license.expires_at,
        reason: 'DOMAIN_MISMATCH',
      };
    }

    return {
      valid: true,
      plugin: license.plugin_slug,
      expiresAt: license.expires_at,
    };
  }

  // ─── Activation ─────────────────────────────────────────────────────────

  /**
   * Explicitly activate (bind) a license to a domain.
   */
  async activateLicense(
    licenseKey: string,
    domain: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rows = await this.db.execute(
      sql`SELECT * FROM plugin_licenses WHERE license_key = ${licenseKey} LIMIT 1`,
    );
    const license = (rows as unknown as LicenseRow[])[0];

    if (!license) return { success: false, error: 'LICENSE_NOT_FOUND' };
    if (license.status !== 'active') return { success: false, error: 'LICENSE_NOT_ACTIVE' };
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return { success: false, error: 'LICENSE_EXPIRED' };
    }
    if (license.domain && license.domain !== domain) {
      return { success: false, error: 'ALREADY_BOUND_TO_DIFFERENT_DOMAIN' };
    }

    await this.db.execute(
      sql`UPDATE plugin_licenses
          SET domain = ${domain}, updated_at = NOW()
          WHERE id = ${license.id}`,
    );

    logger.info({ licenseKey: licenseKey.slice(0, 8) + '...', domain }, 'License activated');
    return { success: true };
  }

  // ─── Revocation ─────────────────────────────────────────────────────────

  async revokeLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.db.execute(
      sql`UPDATE plugin_licenses
          SET status = 'revoked', updated_at = NOW()
          WHERE license_key = ${licenseKey} AND status = 'active'`,
    );
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count === 0) return { success: false, error: 'LICENSE_NOT_FOUND_OR_ALREADY_REVOKED' };

    logger.info({ licenseKey: licenseKey.slice(0, 8) + '...' }, 'License revoked');
    return { success: true };
  }

  async revokeLicenseById(id: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.db.execute(
      sql`UPDATE plugin_licenses
          SET status = 'revoked', updated_at = NOW()
          WHERE id = ${id}::uuid AND status = 'active'`,
    );
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count === 0) return { success: false, error: 'LICENSE_NOT_FOUND_OR_ALREADY_REVOKED' };

    logger.info({ id }, 'License revoked by ID');
    return { success: true };
  }

  // ─── Lookups ────────────────────────────────────────────────────────────

  async getLicenseByPurchase(purchaseId: string): Promise<LicenseRow | null> {
    const rows = await this.db.execute(
      sql`SELECT * FROM plugin_licenses WHERE purchase_id = ${purchaseId} LIMIT 1`,
    );
    return (rows as unknown as LicenseRow[])[0] ?? null;
  }

  async getUserLicenses(userId: string): Promise<LicenseRow[]> {
    // Licenses are linked via purchases → buyer_id
    const rows = await this.db.execute(
      sql`SELECT pl.*
          FROM plugin_licenses pl
          JOIN plugin_purchases pp ON pp.id = pl.purchase_id
          WHERE pp.buyer_id = ${userId}::uuid
          ORDER BY pl.created_at DESC`,
    );
    return rows as unknown as LicenseRow[];
  }

  /**
   * Check if a user has a valid (active + not expired) license for a listing.
   * Used by the install endpoint for download gating.
   */
  async userHasValidLicense(
    userId: string,
    listingId: string,
  ): Promise<{ hasLicense: boolean; status?: string }> {
    const rows = await this.db.execute(
      sql`SELECT pl.status, pl.expires_at
          FROM plugin_licenses pl
          JOIN plugin_purchases pp ON pp.id = pl.purchase_id
          WHERE pp.buyer_id = ${userId}::uuid
            AND pl.listing_id = ${listingId}::uuid
          ORDER BY pl.created_at DESC
          LIMIT 1`,
    );
    const license = (rows as unknown as LicenseRow[])[0];

    if (!license) return { hasLicense: false };
    if (license.status === 'revoked') return { hasLicense: false, status: 'revoked' };
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return { hasLicense: false, status: 'expired' };
    }

    return { hasLicense: true, status: 'active' };
  }
}
