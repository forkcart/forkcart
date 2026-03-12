import type { AIConfig, AIProvider } from '../types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OllamaProvider } from './ollama.js';

/** Factory function to create an AI provider from config */
export function createAIProvider(
  providerName: 'openai' | 'anthropic' | 'ollama',
  config: AIConfig,
): AIProvider {
  switch (providerName) {
    case 'openai': {
      const openaiConfig = config.providers.openai;
      if (!openaiConfig) throw new Error('OpenAI configuration is missing');
      return new OpenAIProvider(openaiConfig.apiKey, openaiConfig.model);
    }
    case 'anthropic': {
      const anthropicConfig = config.providers.anthropic;
      if (!anthropicConfig) throw new Error('Anthropic configuration is missing');
      return new AnthropicProvider(anthropicConfig.apiKey, anthropicConfig.model);
    }
    case 'ollama': {
      const ollamaConfig = config.providers.ollama;
      if (!ollamaConfig) throw new Error('Ollama configuration is missing');
      return new OllamaProvider(ollamaConfig.baseUrl, ollamaConfig.model);
    }
  }
}
