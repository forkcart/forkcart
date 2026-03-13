import type { ChatMessage, ChatProductRef } from '@forkcart/database/schemas';
import type { ChatSessionRepository, ChatbotSettingsRepository } from './repository';
import type { EventBus } from '../plugins/event-bus';
import { CHATBOT_EVENTS } from './events';
import { createLogger } from '../lib/logger';
import { AppError } from '@forkcart/shared';

const logger = createLogger('chatbot-service');

const DEFAULT_SYSTEM_PROMPT = `You are the friendly customer assistant of {shopName}, an online store.
You ONLY help customers with:
- Product questions and recommendations from our catalog
- Order status inquiries
- Shipping and delivery questions
- Returns and refunds

STRICT RULES:
- NEVER provide advice outside of shopping (no coding, no recipes, no general knowledge)
- If a customer asks something unrelated to our shop, politely redirect: "I can only help with questions about our products and orders. Is there anything I can help you find?"
- Keep answers short, friendly and helpful
- Only recommend products that exist in the catalog provided to you
- Reply in the customer's language`;

const DEFAULT_WELCOME_MESSAGE = 'Hi there! 👋 How can I help you?';

/** Context injected into the chatbot system prompt */
export interface ChatContext {
  shopName: string;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    category?: string;
    inStock: boolean;
  }>;
  shippingMethods: Array<{
    name: string;
    price: number;
    estimatedDays?: string;
  }>;
  faqEntries?: Array<{ question: string; answer: string }>;
}

/** Minimal AI provider interface for the chatbot (text generation only) */
export interface ChatbotAIProvider {
  chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<{ content: string }>;
}

export interface ChatbotServiceDeps {
  chatSessionRepository: ChatSessionRepository;
  chatbotSettingsRepository: ChatbotSettingsRepository;
  aiProvider: ChatbotAIProvider | null;
  eventBus: EventBus;
  getContext: () => Promise<ChatContext>;
}

/** Rate limiter — simple in-memory token bucket per session */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * Chatbot service — manages AI-powered customer chat.
 * Uses any AI provider that implements ChatbotAIProvider (via AIProviderRegistry).
 */
export class ChatbotService {
  private readonly sessions: ChatSessionRepository;
  private readonly settings: ChatbotSettingsRepository;
  private readonly ai: ChatbotAIProvider | null;
  private readonly events: EventBus;
  private readonly getContext: () => Promise<ChatContext>;

  constructor(deps: ChatbotServiceDeps) {
    this.sessions = deps.chatSessionRepository;
    this.settings = deps.chatbotSettingsRepository;
    this.ai = deps.aiProvider;
    this.events = deps.eventBus;
    this.getContext = deps.getContext;
  }

  /** Check if chatbot is available (AI configured + enabled) */
  async isAvailable(): Promise<boolean> {
    if (!this.ai) return false;
    const enabled = await this.settings.get('enabled');
    return enabled !== 'false'; // default: enabled if AI is configured
  }

  /** Get chatbot settings */
  async getSettings() {
    const all = await this.settings.getAll();
    return {
      enabled: all['enabled'] !== 'false',
      systemPrompt: all['systemPrompt'] ?? DEFAULT_SYSTEM_PROMPT,
      welcomeMessage: all['welcomeMessage'] ?? DEFAULT_WELCOME_MESSAGE,
    };
  }

  /** Update chatbot settings */
  async updateSettings(input: {
    enabled?: boolean;
    systemPrompt?: string;
    welcomeMessage?: string;
  }) {
    const entries: Record<string, string> = {};
    if (input.enabled !== undefined) entries['enabled'] = String(input.enabled);
    if (input.systemPrompt !== undefined) entries['systemPrompt'] = input.systemPrompt;
    if (input.welcomeMessage !== undefined) entries['welcomeMessage'] = input.welcomeMessage;

    await this.settings.setMany(entries);
    await this.events.emit(CHATBOT_EVENTS.SETTINGS_UPDATED, { settings: input });
    logger.info('Chatbot settings updated');
  }

  /** Send a chat message and get AI response */
  async chat(input: { sessionId?: string; message: string; customerId?: string }): Promise<{
    reply: string;
    sessionId: string;
    products?: ChatProductRef[];
  }> {
    if (!(await this.isAvailable())) {
      throw new AppError('Chatbot is not available', 503, 'CHATBOT_UNAVAILABLE');
    }

    // Sanitize input (basic XSS prevention)
    const sanitizedMessage = sanitizeInput(input.message);
    if (!sanitizedMessage.trim()) {
      throw new AppError('Message cannot be empty', 400, 'VALIDATION_ERROR');
    }
    if (sanitizedMessage.length > 2000) {
      throw new AppError('Message too long (max 2000 chars)', 400, 'VALIDATION_ERROR');
    }

    // Find or create session
    let session = input.sessionId ? await this.sessions.findBySessionId(input.sessionId) : null;

    if (!session) {
      const newSessionId = input.sessionId ?? generateSessionId();
      session = await this.sessions.create({
        sessionId: newSessionId,
        customerId: input.customerId,
      });
      await this.events.emit(CHATBOT_EVENTS.SESSION_CREATED, {
        sessionId: session.id,
      });
    }

    // Rate limit check
    const rateLimitKey = session.sessionId ?? session.id;
    if (!checkRateLimit(rateLimitKey)) {
      throw new AppError('Too many messages. Please wait a moment.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Build context
    const context = await this.getContext();
    const settings = await this.getSettings();

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(settings.systemPrompt, context);

    // Build message history for AI (proper chat messages)
    const existingMessages = (session.messages as ChatMessage[]).slice(-20);
    const aiChatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    for (const m of existingMessages) {
      aiChatMessages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
    }
    aiChatMessages.push({ role: 'user', content: sanitizedMessage });

    const result = await this.ai!.chat(aiChatMessages, {
      maxTokens: 500,
      temperature: 0.7,
    });
    const reply = result.content.trim();

    // Extract product recommendations from reply
    const products = extractProductRefs(reply, context.products);

    // Save messages
    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: now,
    };
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: reply,
      products: products.length > 0 ? products : undefined,
      timestamp: new Date().toISOString(),
    };

    await this.sessions.addMessages(session.id, [userMsg, assistantMsg]);

    await this.events.emit(CHATBOT_EVENTS.MESSAGE_SENT, {
      sessionId: session.id,
      userMessage: sanitizedMessage,
    });

    return {
      reply,
      sessionId: session.sessionId ?? session.id,
      products: products.length > 0 ? products : undefined,
    };
  }

  /** Get product recommendations based on a query */
  async getProductRecommendations(query: string): Promise<ChatProductRef[]> {
    if (!(await this.isAvailable())) return [];

    const context = await this.getContext();
    const result = await this.ai!.chat(
      [
        {
          role: 'system',
          content:
            'You are a product recommendation engine. Given a customer query and product catalog, return ONLY a JSON array of product names that match. Example: ["Product A", "Product B"]. Return empty array if nothing matches.',
        },
        {
          role: 'user',
          content: `Products: ${context.products.map((p) => `${p.name} (${p.category ?? 'uncategorized'}, ${p.inStock ? 'in stock' : 'out of stock'})`).join(', ')}\n\nCustomer query: "${query}"`,
        },
      ],
      { maxTokens: 200, temperature: 0.3 },
    );

    try {
      const names = JSON.parse(result.content) as string[];
      return context.products
        .filter((p) => names.some((n) => p.name.toLowerCase().includes(n.toLowerCase())))
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
        }));
    } catch {
      return [];
    }
  }

  /** Get chat session by ID */
  async getSession(id: string) {
    return this.sessions.findById(id);
  }

  /** Get chat session by session ID */
  async getSessionBySessionId(sessionId: string) {
    return this.sessions.findBySessionId(sessionId);
  }

  /** List all chat sessions (admin) */
  async listSessions(limit = 50, offset = 0) {
    return this.sessions.findAllSessions(limit, offset);
  }
}

/** Build system prompt with context injection */
function buildSystemPrompt(template: string, context: ChatContext): string {
  let prompt = template.replace(/{shopName}/g, context.shopName);

  // Append product catalog
  if (context.products.length > 0) {
    const productList = context.products
      .slice(0, 50) // limit to 50 products for token efficiency
      .map(
        (p) =>
          `- ${p.name}: ${(p.price / 100).toFixed(2)}€ (${p.category ?? 'General'}, ${p.inStock ? 'in stock' : 'out of stock'})`,
      )
      .join('\n');
    prompt += `\n\nAvailable products:\n${productList}`;
  }

  // Append shipping info
  if (context.shippingMethods.length > 0) {
    const shippingList = context.shippingMethods
      .map(
        (s) =>
          `- ${s.name}: ${(s.price / 100).toFixed(2)}€${s.estimatedDays ? ` (${s.estimatedDays} days)` : ''}`,
      )
      .join('\n');
    prompt += `\n\nShipping methods:\n${shippingList}`;
  }

  // Append FAQ
  if (context.faqEntries && context.faqEntries.length > 0) {
    const faqList = context.faqEntries
      .slice(0, 20)
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join('\n\n');
    prompt += `\n\nFAQ:\n${faqList}`;
  }

  return prompt;
}

/** Extract product references from AI reply by matching product names */
function extractProductRefs(reply: string, products: ChatContext['products']): ChatProductRef[] {
  const matches: ChatProductRef[] = [];
  const lowerReply = reply.toLowerCase();

  for (const p of products) {
    if (lowerReply.includes(p.name.toLowerCase()) && matches.length < 4) {
      matches.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
      });
    }
  }
  return matches;
}

/** Basic XSS sanitization */
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Generate a random session ID */
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
