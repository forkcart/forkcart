import { eq, desc, sql } from 'drizzle-orm';
import type { Database } from '@forkcart/database';
import { chatSessions, chatbotSettings } from '@forkcart/database/schemas';
import type { ChatMessage } from '@forkcart/database/schemas';

const MAX_MESSAGES_PER_SESSION = 50;

/** Chat session repository — data access for chat sessions */
export class ChatSessionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const result = await this.db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, id),
    });
    return result ?? null;
  }

  async findBySessionId(sessionId: string) {
    const result = await this.db.query.chatSessions.findFirst({
      where: eq(chatSessions.sessionId, sessionId),
    });
    return result ?? null;
  }

  async findAllSessions(limit = 50, offset = 0) {
    const rows = await this.db.query.chatSessions.findMany({
      orderBy: desc(chatSessions.updatedAt),
      limit,
      offset,
    });

    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(chatSessions);

    return { rows, total: countRow?.total ?? 0 };
  }

  async create(input: { customerId?: string; sessionId?: string }) {
    const [session] = await this.db
      .insert(chatSessions)
      .values({
        customerId: input.customerId ?? null,
        sessionId: input.sessionId ?? null,
        messages: [],
        messageCount: 0,
      })
      .returning();
    return session!;
  }

  async addMessages(id: string, newMessages: ChatMessage[]) {
    const session = await this.findById(id);
    if (!session) return null;

    let messages = [...(session.messages as ChatMessage[]), ...newMessages];
    // Trim oldest if over limit
    if (messages.length > MAX_MESSAGES_PER_SESSION) {
      messages = messages.slice(messages.length - MAX_MESSAGES_PER_SESSION);
    }

    const [updated] = await this.db
      .update(chatSessions)
      .set({
        messages,
        messageCount: messages.length,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, id))
      .returning();
    return updated ?? null;
  }
}

/** Chatbot settings repository */
export class ChatbotSettingsRepository {
  constructor(private readonly db: Database) {}

  async get(key: string): Promise<string | null> {
    const result = await this.db.query.chatbotSettings.findFirst({
      where: eq(chatbotSettings.key, key),
    });
    return result?.value ?? null;
  }

  async set(key: string, value: string) {
    const existing = await this.get(key);
    if (existing !== null) {
      await this.db
        .update(chatbotSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(chatbotSettings.key, key));
    } else {
      await this.db.insert(chatbotSettings).values({ key, value });
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.query.chatbotSettings.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async setMany(entries: Record<string, string>) {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value);
    }
  }
}
