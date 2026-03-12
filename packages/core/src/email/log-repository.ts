import { desc } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { emailLogs } from '@forkcart/database/schemas';

export interface EmailLogEntry {
  id: string;
  provider: string;
  to: string;
  subject: string;
  template: string;
  messageId: string;
  status: string;
  sentAt: Date;
}

export interface CreateEmailLogInput {
  provider: string;
  to: string;
  subject: string;
  template: string;
  messageId: string;
  status: string;
}

/**
 * Repository for email log entries — tracks all sent emails for admin visibility.
 */
export class EmailLogRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateEmailLogInput): Promise<EmailLogEntry> {
    const [entry] = await this.db
      .insert(emailLogs)
      .values({
        provider: input.provider,
        to: input.to,
        subject: input.subject,
        template: input.template,
        messageId: input.messageId,
        status: input.status,
      })
      .returning();

    if (!entry) throw new Error('Failed to create email log entry');
    return entry as EmailLogEntry;
  }

  async findRecent(limit: number = 50): Promise<EmailLogEntry[]> {
    const entries = await this.db.query.emailLogs.findMany({
      orderBy: [desc(emailLogs.sentAt)],
      limit,
    });

    return entries as EmailLogEntry[];
  }
}
