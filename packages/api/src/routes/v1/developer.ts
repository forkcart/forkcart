import { Hono } from 'hono';
import { z } from 'zod';
import type { PluginStoreService } from '@forkcart/core';

const RegisterDeveloperSchema = z.object({
  companyName: z.string().min(1).max(255),
  website: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  logo: z.string().url().optional(),
});

/** Developer routes — registration + plugin upload */
export function createDeveloperRoutes(pluginStoreService: PluginStoreService) {
  const router = new Hono();

  /** Register as a plugin developer */
  router.post('/register', async (c) => {
    const body = await c.req.json();
    const input = RegisterDeveloperSchema.parse(body);

    // Get user from auth context (optional — could be public registration)
    const user = c.get('user') as { id: string } | undefined;
    const userId = user?.id;

    // Check if user already has a developer account
    if (userId) {
      const existing = await pluginStoreService.getDeveloperByUserId(userId);
      if (existing) {
        return c.json(
          { error: { code: 'CONFLICT', message: 'You already have a developer account' } },
          409,
        );
      }
    }

    const developer = await pluginStoreService.registerDeveloper(input, userId);
    return c.json({ data: developer }, 201);
  });

  /** Get my developer profile */
  router.get('/me', async (c) => {
    const apiKey = c.req.header('X-Developer-Key');
    const user = c.get('user') as { id: string } | undefined;

    let developer;
    if (apiKey) {
      developer = await pluginStoreService.getDeveloperByApiKey(apiKey);
    } else if (user?.id) {
      developer = await pluginStoreService.getDeveloperByUserId(user.id);
    }

    if (!developer) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Developer account not found' } }, 404);
    }

    return c.json({ data: developer });
  });

  /** Get my plugins */
  router.get('/plugins', async (c) => {
    const developer = await resolveDeveloper(c, pluginStoreService);
    if (!developer) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Valid developer account required' } },
        401,
      );
    }

    const plugins = await pluginStoreService.getPluginsByDeveloper(developer.id);
    return c.json({ data: plugins });
  });

  /** Upload a plugin ZIP */
  router.post('/plugins/upload', async (c) => {
    const developer = await resolveDeveloper(c, pluginStoreService);
    if (!developer) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Valid developer account required' } },
        401,
      );
    }

    const contentType = c.req.header('content-type') ?? '';

    let zipBuffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return c.json(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'No file uploaded. Send as multipart "file" field.',
            },
          },
          400,
        );
      }
      zipBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Raw body upload
      const body = await c.req.arrayBuffer();
      zipBuffer = Buffer.from(body);
    }

    if (zipBuffer.length === 0) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Empty file' } }, 400);
    }

    // Max 50MB
    if (zipBuffer.length > 50 * 1024 * 1024) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'File too large (max 50MB)' } }, 400);
    }

    try {
      const result = await pluginStoreService.uploadPlugin(zipBuffer, developer.id);
      return c.json({ data: result }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return c.json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
    }
  });

  return router;
}

/** Helper: resolve developer from X-Developer-Key header or auth context */
async function resolveDeveloper(
  c: { req: { header: (name: string) => string | undefined }; get: (key: string) => unknown },
  pluginStoreService: PluginStoreService,
) {
  const apiKey = c.req.header('X-Developer-Key');
  if (apiKey) {
    return pluginStoreService.getDeveloperByApiKey(apiKey);
  }

  const user = c.get('user') as { id: string } | undefined;
  if (user?.id) {
    return pluginStoreService.getDeveloperByUserId(user.id);
  }

  return null;
}
