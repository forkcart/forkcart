import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { mobileAppConfig } from '@forkcart/database/schemas';
import { createLogger } from '../lib/logger';

const logger = createLogger('mobile-app-repo');

export interface MobileAppConfig {
  id: string;
  appName: string;
  appSlug: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  iconMediaId: string | null;
  splashMediaId: string | null;
  apiUrl: string;
  bundleId: string | null;
  androidPackage: string | null;
  buildMode: string;
  lastBuildAt: Date | null;
  lastBuildStatus: string | null;
  lastBuildUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMobileAppConfig {
  appName?: string;
  appSlug?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  iconMediaId?: string | null;
  splashMediaId?: string | null;
  apiUrl?: string;
  bundleId?: string | null;
  androidPackage?: string | null;
  buildMode?: string;
  lastBuildAt?: Date | null;
  lastBuildStatus?: string | null;
  lastBuildUrl?: string | null;
}

/**
 * Repository for mobile app configuration.
 * Uses singleton pattern — only one config row exists.
 */
export class MobileAppRepository {
  constructor(private readonly db: Database) {}

  /** Get the current config (or null if not configured) */
  async get(): Promise<MobileAppConfig | null> {
    const rows = await this.db.select().from(mobileAppConfig).limit(1);
    const row = rows[0];
    if (!row) return null;
    return row as MobileAppConfig;
  }

  /** Save config (upsert — insert or update the single row) */
  async save(data: UpdateMobileAppConfig): Promise<MobileAppConfig> {
    const existing = await this.db
      .select({ id: mobileAppConfig.id })
      .from(mobileAppConfig)
      .limit(1);

    if (existing[0]) {
      const updated = await this.db
        .update(mobileAppConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(mobileAppConfig.id, existing[0].id))
        .returning();
      logger.info('Mobile app config updated');
      return updated[0] as MobileAppConfig;
    } else {
      const inserted = await this.db.insert(mobileAppConfig).values(data).returning();
      logger.info('Mobile app config created');
      return inserted[0] as MobileAppConfig;
    }
  }

  /** Update build status fields */
  async updateBuildStatus(status: string, buildUrl?: string | null): Promise<void> {
    const existing = await this.db
      .select({ id: mobileAppConfig.id })
      .from(mobileAppConfig)
      .limit(1);

    if (!existing[0]) return;

    await this.db
      .update(mobileAppConfig)
      .set({
        lastBuildAt: new Date(),
        lastBuildStatus: status,
        lastBuildUrl: buildUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(mobileAppConfig.id, existing[0].id));
  }
}
