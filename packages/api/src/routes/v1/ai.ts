import { Hono } from 'hono';
import { z } from 'zod';
import type { AIProviderRegistry, AIProviderId } from '@forkcart/ai';
import type { ProductAIService, AISettingsRepository } from '@forkcart/core';
import type { ProductService } from '@forkcart/core';

const SaveSettingsSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'openrouter']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().optional(),
});

const ImproveSchema = z.object({
  currentDescription: z.string().min(1),
});

/** AI routes — settings, testing, and product AI generation (admin only) */
export function createAIRoutes(
  aiRegistry: AIProviderRegistry,
  aiSettingsRepo: AISettingsRepository,
  productAIService: ProductAIService,
  productService: ProductService,
) {
  const router = new Hono();

  /** GET /status — provider status */
  router.get('/status', async (c) => {
    const provider = aiRegistry.getConfiguredProvider();
    const settings = aiRegistry.getSettings();
    return c.json({
      data: {
        configured: provider !== null,
        provider: settings?.provider ?? null,
        model: settings?.model ?? null,
        availableProviders: aiRegistry.getAllProviders(),
      },
    });
  });

  /** POST /settings — save AI settings */
  router.post('/settings', async (c) => {
    const body = await c.req.json();
    const settings = SaveSettingsSchema.parse(body);

    // Save to DB
    await aiSettingsRepo.save({
      provider: settings.provider as AIProviderId,
      apiKey: settings.apiKey,
      model: settings.model,
    });

    // Update registry
    aiRegistry.configure({
      provider: settings.provider as AIProviderId,
      apiKey: settings.apiKey,
      model: settings.model,
    });

    return c.json({ data: { success: true } });
  });

  /** GET /settings — get AI settings (masked key) */
  router.get('/settings', async (c) => {
    const settings = aiRegistry.getSettings();
    if (!settings) {
      return c.json({ data: null });
    }

    return c.json({
      data: {
        provider: settings.provider,
        apiKey: maskApiKey(settings.apiKey),
        model: settings.model ?? null,
      },
    });
  });

  /** POST /test — test connection with the configured provider */
  router.post('/test', async (c) => {
    const provider = aiRegistry.getConfiguredProvider();
    if (!provider) {
      return c.json({ data: { success: false, error: 'No AI provider configured' } }, 400);
    }

    try {
      const response = await provider.chat(
        [{ role: 'user', content: 'Say "Hello from ForkCart!" in exactly those words.' }],
        { maxTokens: 50, temperature: 0 },
      );

      return c.json({
        data: {
          success: true,
          response: response.content,
          model: response.model,
          usage: response.usage,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ data: { success: false, error: message } }, 400);
    }
  });

  /** POST /products/:id/description — generate description */
  router.post('/products/:id/description', async (c) => {
    const productId = c.req.param('id');
    const product = await productService.getById(productId);
    const description = await productAIService.generateDescription({
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      sku: product.sku,
      price: product.price,
      currency: product.currency,
    });

    return c.json({ data: { description } });
  });

  /** POST /products/:id/seo — generate SEO metadata */
  router.post('/products/:id/seo', async (c) => {
    const productId = c.req.param('id');
    const product = await productService.getById(productId);
    const seo = await productAIService.generateSEOMetadata({
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription,
      price: product.price,
      currency: product.currency,
    });

    return c.json({ data: seo });
  });

  /** POST /products/:id/improve — improve existing description */
  router.post('/products/:id/improve', async (c) => {
    const productId = c.req.param('id');
    const body = await c.req.json();
    const { currentDescription } = ImproveSchema.parse(body);
    const product = await productService.getById(productId);

    const improved = await productAIService.improveDescription(
      {
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        currency: product.currency,
      },
      currentDescription,
    );

    return c.json({ data: { description: improved } });
  });

  return router;
}

/** Mask an API key for display: show first 8 and last 4 chars */
function maskApiKey(key: string): string {
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 8)}${'•'.repeat(Math.min(key.length - 12, 20))}${key.slice(-4)}`;
}
