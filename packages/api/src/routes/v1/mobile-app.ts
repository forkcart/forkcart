import { Hono } from 'hono';
import { z } from 'zod';
import { createReadStream } from 'node:fs';
import { stat, mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { MobileAppService } from '@forkcart/core';

const UpdateConfigSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  appSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color')
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color')
    .optional(),
  iconMediaId: z.string().uuid().nullable().optional(),
  splashMediaId: z.string().uuid().nullable().optional(),
  apiUrl: z.string().url().or(z.literal('')).optional(),
  bundleId: z.string().max(200).nullable().optional(),
  androidPackage: z.string().max(200).nullable().optional(),
  buildMode: z.enum(['casual', 'developer']).optional(),
});

/** Mobile App Builder routes (admin only) */
export function createMobileAppRoutes(mobileAppService: MobileAppService) {
  const router = new Hono();

  /** GET /config — get current mobile app config */
  router.get('/config', async (c) => {
    const config = await mobileAppService.getConfig();
    return c.json({ data: config });
  });

  /** PUT /config — update mobile app config */
  router.put('/config', async (c) => {
    const body = await c.req.json();
    const data = UpdateConfigSchema.parse(body);
    const config = await mobileAppService.updateConfig(data);
    return c.json({ data: config });
  });

  /** POST /generate — generate Expo project ZIP for download */
  router.post('/generate', async (_c) => {
    const zipPath = await mobileAppService.generateProject();

    try {
      const fileStat = await stat(zipPath);
      const stream = createReadStream(zipPath);

      // Schedule cleanup after response is sent
      stream.on('end', () => {
        mobileAppService.cleanupProject(zipPath).catch(() => {});
      });

      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="forkcart-mobile.zip"',
          'Content-Length': String(fileStat.size),
        },
      });
    } catch (err) {
      await mobileAppService.cleanupProject(zipPath).catch(() => {});
      throw err;
    }
  });

  /** POST /build-native — build a native APK/IPA on the server */
  router.post('/build-native', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const platform = (body as { platform?: string }).platform;
    if (platform !== 'android' && platform !== 'ios') {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'platform must be "android" or "ios"' } },
        400,
      );
    }

    const result = await mobileAppService.buildNative(platform);

    try {
      const ext = platform === 'android' ? 'apk' : 'ipa';
      const filename = `forkcart-mobile-${Date.now()}.${ext}`;
      const destDir = resolve(process.cwd(), 'uploads', 'builds');
      await mkdir(destDir, { recursive: true });
      const destPath = resolve(destDir, filename);
      await cp(result.filePath, destPath);

      await mobileAppService.cleanupNative(result.tmpDir).catch(() => {});

      const fileStat = await stat(destPath);
      const downloadUrl = `/uploads/builds/${filename}`;

      return c.json({
        data: {
          downloadUrl,
          filename,
          size: fileStat.size,
          platform,
        },
      });
    } catch (err) {
      await mobileAppService.cleanupNative(result.tmpDir).catch(() => {});
      throw err;
    }
  });

  /** POST /build — trigger cloud build (placeholder) */
  router.post('/build', async (c) => {
    const result = await mobileAppService.triggerBuild();
    return c.json({ data: result });
  });

  /** GET /build/status — check build status */
  router.get('/build/status', async (c) => {
    const status = await mobileAppService.getBuildStatus();
    return c.json({ data: status });
  });

  /** GET /download/:type — download APK or IPA (placeholder) */
  router.get('/download/:type', async (c) => {
    const type = c.req.param('type');
    if (type !== 'apk' && type !== 'ipa') {
      return c.json({ error: { message: 'Invalid type. Use "apk" or "ipa".' } }, 400);
    }

    const status = await mobileAppService.getBuildStatus();
    if (status.status !== 'ready' || !status.buildUrl) {
      return c.json(
        {
          error: {
            message: 'No build available. Trigger a build first.',
          },
        },
        404,
      );
    }

    // When EAS integration is ready, this would redirect to the build URL
    return c.redirect(status.buildUrl);
  });

  return router;
}
