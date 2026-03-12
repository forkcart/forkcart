import pino from 'pino';
import type { AIProvider, AIProviderId, AISettings } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { OpenRouterProvider } from './providers/openrouter';

const logger = pino({ name: 'ai-registry' });

/** Provider metadata for display in admin UI */
export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  defaultModel: string;
  configured: boolean;
}

/**
 * Central registry for AI providers.
 * Manages creation and lifecycle of provider instances based on stored settings.
 */
export class AIProviderRegistry {
  private activeProvider: AIProvider | null = null;
  private activeSettings: AISettings | null = null;

  /** All known provider definitions */
  private static readonly providerDefs: Array<{
    id: AIProviderId;
    name: string;
    defaultModel: string;
  }> = [
    { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini' },
    { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-sonnet-4-20250514' },
    { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      defaultModel: 'anthropic/claude-sonnet-4-20250514',
    },
  ];

  /** Configure and activate a provider from settings */
  configure(settings: AISettings): void {
    this.activeProvider = this.createProvider(settings);
    this.activeSettings = settings;
    logger.info({ provider: settings.provider }, 'AI provider configured');
  }

  /** Clear configuration */
  clear(): void {
    this.activeProvider = null;
    this.activeSettings = null;
    logger.info('AI provider cleared');
  }

  /** Get the active, configured provider — returns null if none configured */
  getConfiguredProvider(): AIProvider | null {
    if (this.activeProvider && this.activeProvider.isConfigured()) {
      return this.activeProvider;
    }
    return null;
  }

  /** Get current settings */
  getSettings(): AISettings | null {
    return this.activeSettings;
  }

  /** Get all available providers with their configuration status */
  getAllProviders(): AIProviderInfo[] {
    return AIProviderRegistry.providerDefs.map((def) => ({
      id: def.id,
      name: def.name,
      defaultModel: def.defaultModel,
      configured: this.activeSettings?.provider === def.id && this.activeProvider !== null,
    }));
  }

  /** Create a provider instance for one-off use (e.g., connection testing) */
  createProvider(settings: AISettings): AIProvider {
    switch (settings.provider) {
      case 'openai':
        return new OpenAIProvider(settings.apiKey, settings.model);
      case 'anthropic':
        return new AnthropicProvider(settings.apiKey, settings.model);
      case 'gemini':
        return new GeminiProvider(settings.apiKey, settings.model);
      case 'openrouter':
        return new OpenRouterProvider(settings.apiKey, settings.model);
    }
  }
}
