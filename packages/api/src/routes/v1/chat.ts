import { Hono } from 'hono';
import { z } from 'zod';
import type { ChatbotService } from '@forkcart/core';

const ChatMessageSchema = z.object({
  sessionId: z.string().nullable().optional(),
  message: z.string().min(1).max(2000),
});

const UpdateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  systemPrompt: z.string().min(1).max(5000).optional(),
  welcomeMessage: z.string().min(1).max(500).optional(),
});

/** Public chat routes (storefront) */
export function createChatRoutes(chatbotService: ChatbotService) {
  const router = new Hono();

  /** Check if chatbot is available */
  router.get('/status', async (c) => {
    const available = await chatbotService.isAvailable();
    const settings = await chatbotService.getSettings();
    return c.json({
      data: {
        available,
        welcomeMessage: available ? settings.welcomeMessage : null,
      },
    });
  });

  /** Send a chat message */
  router.post('/', async (c) => {
    const body = await c.req.json();
    const input = ChatMessageSchema.parse(body);
    const result = await chatbotService.chat({
      sessionId: input.sessionId ?? undefined,
      message: input.message,
    });
    return c.json({ data: result });
  });

  /** Get chat history for a session */
  router.get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');
    const session = await chatbotService.getSessionBySessionId(sessionId);
    if (!session) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } }, 404);
    }
    return c.json({
      data: {
        id: session.id,
        sessionId: session.sessionId,
        messages: session.messages,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
      },
    });
  });

  return router;
}

/** Admin chat routes */
export function createChatAdminRoutes(chatbotService: ChatbotService) {
  const router = new Hono();

  /** Get chatbot settings */
  router.get('/settings', async (c) => {
    const settings = await chatbotService.getSettings();
    return c.json({ data: settings });
  });

  /** Update chatbot settings */
  router.put('/settings', async (c) => {
    const body = await c.req.json();
    const input = UpdateSettingsSchema.parse(body);
    await chatbotService.updateSettings(input);
    const settings = await chatbotService.getSettings();
    return c.json({ data: settings });
  });

  /** List all chat sessions */
  router.get('/sessions', async (c) => {
    const limit = parseInt(c.req.query('limit') ?? '50', 10);
    const offset = parseInt(c.req.query('offset') ?? '0', 10);
    const { rows, total } = await chatbotService.listSessions(limit, offset);
    return c.json({
      data: rows.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        customerId: s.customerId,
        messageCount: s.messageCount,
        lastMessage:
          Array.isArray(s.messages) && s.messages.length > 0
            ? (s.messages as Array<{ content: string }>)[s.messages.length - 1]?.content
            : null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      pagination: { limit, offset, total },
    });
  });

  /** Get session details */
  router.get('/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = await chatbotService.getSession(id);
    if (!session) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } }, 404);
    }
    return c.json({ data: session });
  });

  return router;
}
