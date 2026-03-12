import pino from 'pino';
import type { AIConfig, AIProvider, TextGenerationOptions, TextGenerationResult } from './types';
import { createAIProvider } from './providers/index';

const logger = pino({ name: 'ai-service' });

/**
 * AI service — manages providers and provides a unified interface for AI operations.
 * Supports caching and automatic provider fallback.
 */
export class AIService {
  private readonly providers = new Map<string, AIProvider>();
  private readonly defaultProvider: string;
  private readonly cache = new Map<string, { result: TextGenerationResult; expiresAt: number }>();
  private readonly cacheTtl: number;
  private readonly cacheEnabled: boolean;

  constructor(config: AIConfig) {
    this.defaultProvider = config.defaultProvider;
    this.cacheTtl = config.cache?.ttlSeconds ?? 3600;
    this.cacheEnabled = config.cache?.enabled ?? false;

    // Initialize configured providers
    for (const providerName of Object.keys(config.providers) as Array<
      keyof typeof config.providers
    >) {
      if (config.providers[providerName]) {
        try {
          const provider = createAIProvider(providerName, config);
          this.providers.set(providerName, provider);
          logger.info({ provider: providerName }, 'AI provider initialized');
        } catch (error) {
          logger.warn({ provider: providerName, error }, 'Failed to initialize AI provider');
        }
      }
    }
  }

  /** Generate text using the specified or default provider */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const providerName = options.provider ?? this.defaultProvider;

    // Check cache
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(providerName, options);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug({ provider: providerName }, 'Cache hit');
        return cached.result;
      }
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider "${providerName}" is not configured`);
    }

    const result = await provider.generateText(options);

    // Store in cache
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(providerName, options);
      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + this.cacheTtl * 1000,
      });
    }

    return result;
  }

  /** Generate a product description using AI */
  async generateProductDescription(
    productName: string,
    attributes: Record<string, string> = {},
  ): Promise<string> {
    const attributeList = Object.entries(attributes)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const result = await this.generateText({
      systemPrompt:
        'You are an e-commerce copywriter. Write compelling, SEO-friendly product descriptions. Keep it concise (2-3 paragraphs).',
      prompt: `Write a product description for: "${productName}"\n\nAttributes:\n${attributeList || 'None specified'}`,
      maxTokens: 500,
      temperature: 0.8,
    });

    return result.text;
  }

  /** Generate SEO metadata for a product */
  async generateSEOMetadata(
    productName: string,
    description: string,
  ): Promise<{ title: string; metaDescription: string }> {
    const result = await this.generateText({
      systemPrompt:
        'You are an SEO specialist. Generate an SEO title (max 60 chars) and meta description (max 155 chars). Return as JSON: {"title": "...", "metaDescription": "..."}',
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

  private getCacheKey(provider: string, options: TextGenerationOptions): string {
    return `${provider}:${options.prompt}:${options.systemPrompt ?? ''}:${options.temperature ?? 0.7}`;
  }
}
