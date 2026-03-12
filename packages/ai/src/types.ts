/** Configuration for the AI layer */
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

/** Text generation options */
export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: 'openai' | 'anthropic' | 'ollama';
}

/** Text generation result */
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

/** Provider interface — all AI providers implement this */
export interface AIProvider {
  readonly name: string;
  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>;
}
