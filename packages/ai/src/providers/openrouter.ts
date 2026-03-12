import type { AIProvider, ChatMessage, ChatOptions, ChatResponse } from '../types';

/** OpenRouter provider — OpenAI-compatible API with custom base URL */
export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter' as const;
  readonly name = 'OpenRouter';
  readonly defaultModel = 'anthropic/claude-sonnet-4-20250514';

  constructor(
    private readonly apiKey: string,
    private readonly modelOverride?: string,
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model ?? this.modelOverride ?? this.defaultModel;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://forkcart.dev',
        'X-Title': 'ForkCart',
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const choice = data.choices[0];
    if (!choice) throw new Error('No response from OpenRouter');

    return {
      content: choice.message.content,
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }
}
