import { eq } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { aiSettings } from '@forkcart/database/schemas';
import type { AIProviderId, AISettings } from '@forkcart/ai';
import { createLogger } from '../lib/logger';

const logger = createLogger('ai-settings-repo');

/**
 * Repository for AI settings.
 * Uses a singleton pattern — only one settings row exists.
 */
export class AISettingsRepository {
  constructor(private readonly db: Database) {}

  /** Get the current AI settings (or null if not configured) */
  async get(): Promise<AISettings | null> {
    const rows = await this.db.select().from(aiSettings).limit(1);
    const row = rows[0];
    if (!row) return null;

    return {
      provider: row.provider as AIProviderId,
      apiKey: row.apiKey,
      model: row.model ?? undefined,
    };
  }

  /** Save AI settings (upsert — insert or update the single row) */
  async save(settings: AISettings): Promise<void> {
    const existing = await this.db.select({ id: aiSettings.id }).from(aiSettings).limit(1);

    if (existing[0]) {
      await this.db
        .update(aiSettings)
        .set({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model ?? null,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.id, existing[0].id));
      logger.info({ provider: settings.provider }, 'AI settings updated');
    } else {
      await this.db.insert(aiSettings).values({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model ?? null,
      });
      logger.info({ provider: settings.provider }, 'AI settings created');
    }
  }

  /** Delete AI settings */
  async clear(): Promise<void> {
    await this.db.delete(aiSettings);
    logger.info('AI settings cleared');
  }
}
