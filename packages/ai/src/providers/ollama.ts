import type { AIProvider, TextGenerationOptions, TextGenerationResult } from '../types.js';

/** Ollama provider for local/self-hosted models */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string = 'http://localhost:11434',
    private readonly model: string = 'llama3.2',
  ) {}

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const prompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${options.prompt}`
      : options.prompt;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 1000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as {
      response: string;
      eval_count?: number;
      prompt_eval_count?: number;
    };

    return {
      text: data.response,
      provider: this.name,
      model: this.model,
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count ?? 0) + data.eval_count,
          }
        : undefined,
    };
  }
}
