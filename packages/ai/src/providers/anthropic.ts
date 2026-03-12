import type { AIProvider, TextGenerationOptions, TextGenerationResult } from '../types.js';

/** Anthropic provider using the REST API directly */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-sonnet-4-20250514',
  ) {}

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1000,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: options.prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const textBlock = data.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('No text response from Anthropic');
    }

    return {
      text: textBlock.text,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}
