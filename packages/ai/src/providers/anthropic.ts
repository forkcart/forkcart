import type { AIProvider, ChatMessage, ChatOptions, ChatResponse } from '../types';

/** Anthropic provider — uses the REST API directly */
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly name = 'Anthropic';
  readonly defaultModel = 'claude-sonnet-4-20250514';

  constructor(
    private readonly apiKey: string,
    private readonly modelOverride?: string,
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model ?? this.modelOverride ?? this.defaultModel;

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.maxTokens ?? 1000,
      messages: chatMessages,
    };
    if (systemMessage) {
      body['system'] = systemMessage.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const textBlock = data.content.find((block) => block.type === 'text');
    if (!textBlock) throw new Error('No text response from Anthropic');

    return {
      content: textBlock.text,
      model: data.model,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }
}
