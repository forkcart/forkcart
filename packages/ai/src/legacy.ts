import pino from 'pino';
import type { ChatMessage, ChatOptions, ChatResponse } from './types';
import type { AIProvider } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

const logger = pino({ name: 'ai-service-legacy' });

/**
 * @deprecated — Use AIProviderRegistry + individual providers instead.
 * Kept for backward compatibility with ChatbotService and SearchService.
 */

/** Legacy configuration for the AI layer */
export interface AIConfig {
  defaultProvider: 'openai' | 'anthropic' | 'ollama';
  providers: {
    openai?: { apiKey: string; model?: string };
    anthropic?: { apiKey: string; model?: string };
    ollama?: { baseUrl: string; model?: string };
  };
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

/** Legacy text generation options */
export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: 'openai' | 'anthropic' | 'ollama';
}

/** Legacy text generation result */
export interface TextGenerationResult {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * @deprecated Legacy AI service — wraps the new provider system.
 */
export class AIService {
  private readonly providers = new Map<string, AIProvider>();
  private readonly defaultProvider: string;

  constructor(config: AIConfig) {
    this.defaultProvider = config.defaultProvider;

    // Initialize providers from config
    const openaiConfig = config.providers.openai;
    if (openaiConfig) {
      try {
        this.providers.set('openai', new OpenAIProvider(openaiConfig.apiKey, openaiConfig.model));
        logger.info('Legacy OpenAI provider initialized');
      } catch (error) {
        logger.warn({ error }, 'Failed to initialize legacy OpenAI provider');
      }
    }

    const anthropicConfig = config.providers.anthropic;
    if (anthropicConfig) {
      try {
        this.providers.set(
          'anthropic',
          new AnthropicProvider(anthropicConfig.apiKey, anthropicConfig.model),
        );
        logger.info('Legacy Anthropic provider initialized');
      } catch (error) {
        logger.warn({ error }, 'Failed to initialize legacy Anthropic provider');
      }
    }

    // Note: Ollama provider removed — use the new registry system for local models
  }

  /** Generate text using the legacy interface */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const providerName = options.provider ?? this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider "${providerName}" is not configured`);
    }

    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const chatOptions: ChatOptions = {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    };

    const response: ChatResponse = await provider.chat(messages, chatOptions);

    return {
      text: response.content,
      provider: providerName,
      model: response.model,
      usage: {
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens: response.usage.inputTokens + response.usage.outputTokens,
      },
    };
  }

  /** Legacy: generate product description */
  async generateProductDescription(
    productName: string,
    attributes: Record<string, string> = {},
  ): Promise<string> {
    const attributeList = Object.entries(attributes)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const result = await this.generateText({
      systemPrompt:
        'You are an e-commerce copywriter. Write compelling, SEO-friendly product descriptions.',
      prompt: `Write a product description for: "${productName}"\n\nAttributes:\n${attributeList || 'None specified'}`,
      maxTokens: 500,
      temperature: 0.8,
    });

    return result.text;
  }

  /** Legacy: generate SEO metadata */
  async generateSEOMetadata(
    productName: string,
    description: string,
  ): Promise<{ title: string; metaDescription: string }> {
    const result = await this.generateText({
      systemPrompt:
        'You are an SEO specialist. Generate an SEO title (max 60 chars) and meta description (max 155 chars). Return as JSON.',
      prompt: `Product: "${productName}"\nDescription: "${description}"`,
      maxTokens: 200,
      temperature: 0.5,
    });

    try {
      return JSON.parse(result.text) as { title: string; metaDescription: string };
    } catch {
      return { title: productName, metaDescription: description.slice(0, 155) };
    }
  }
}
