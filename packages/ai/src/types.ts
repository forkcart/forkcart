/** Supported AI provider identifiers */
export type AIProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter';

/** Chat message for AI conversations */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options for AI chat completion */
export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Response from an AI chat completion */
export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** AI provider interface — all providers implement this */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly name: string;
  readonly defaultModel: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  isConfigured(): boolean;
}

/** Stored AI settings (from database) */
export interface AISettings {
  provider: AIProviderId;
  apiKey: string;
  model?: string;
}
