import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { MediaService } from '@forkcart/core';
import { PaginationSchema, IdParamSchema } from '@forkcart/shared';
import { requireRole } from '../../middleware/permissions';

/**
 * RVS-032: Allowed MIME types with their magic byte signatures.
 * Used for server-side file type validation (never trust Content-Type alone).
 */
const ALLOWED_MIME_SIGNATURES: ReadonlyArray<{
  mime: string;
  /** Magic bytes at the start of the file (hex) */
  magic: number[];
  /** Optional byte offset for the magic check (default 0) */
  offset?: number;
}> = [
  { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', magic: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
  { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

/**
 * Validate a file's actual content against allowed MIME types using magic bytes.
 * SVG is validated separately since it's text-based (XML).
 *
 * @returns The detected MIME type, or null if the file doesn't match any allowed type.
 */
function validateMagicBytes(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  // Check binary signatures
  for (const sig of ALLOWED_MIME_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (bytes.length < offset + sig.magic.length) continue;

    const matches = sig.magic.every((b, i) => bytes[offset + i] === b);
    if (!matches) continue;

    // WebP needs extra check: bytes 8-11 must be "WEBP"
    if (sig.mime === 'image/webp') {
      if (bytes.length < 12) continue;
      const webpTag =
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      if (!webpTag) continue;
    }

    return sig.mime;
  }

  // SVG: check for XML/SVG text content (first 512 bytes)
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512));
  if (head.includes('<svg') || head.includes('<?xml')) {
    if (head.includes('<svg') || head.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return 'image/svg+xml';
    }
  }

  return null;
}

/** Media CRUD + upload routes */
export function createMediaRoutes(mediaService: MediaService) {
  const router = new Hono();

  /** Upload a file (multipart) */
  router.post(
    '/upload',
    requireRole('admin', 'superadmin'),
    bodyLimit({ maxSize: 10 * 1024 * 1024 }), // 10MB
    async (c) => {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'No file provided' } }, 400);
      }

      // RVS-032: Validate actual file content via magic bytes (never trust Content-Type)
      const fileBuffer = await file.arrayBuffer();
      const detectedMime = validateMagicBytes(fileBuffer);
      if (!detectedMime) {
        return c.json(
          {
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'File type not allowed. Supported: JPEG, PNG, GIF, WebP, SVG, PDF',
            },
          },
          400,
        );
      }

      const alt = formData.get('alt') as string | null;
      const entityType = formData.get('entityType') as string | null;
      const entityId = formData.get('entityId') as string | null;
      const sortOrderStr = formData.get('sortOrder') as string | null;

      const result = await mediaService.upload({
        file,
        originalName: file.name,
        alt: alt ?? undefined,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        sortOrder: sortOrderStr ? parseInt(sortOrderStr, 10) : undefined,
      });

      return c.json({ data: result }, 201);
    },
  );

  /** List all media */
  router.get('/', requireRole('admin', 'superadmin'), async (c) => {
    const query = c.req.query();
    const pagination = PaginationSchema.parse(query);
    const result = await mediaService.list(pagination);
    return c.json(result);
  });

  /** Get single media by ID */
  router.get('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    const result = await mediaService.getById(id);
    return c.json({ data: result });
  });

  /** Delete media (file + DB) */
  router.delete('/:id', requireRole('admin', 'superadmin'), async (c) => {
    const { id } = IdParamSchema.parse({ id: c.req.param('id') });
    await mediaService.delete(id);
    return c.json({ success: true });
  });

  /** Reorder media */
  router.put('/reorder', requireRole('admin', 'superadmin'), async (c) => {
    const body = (await c.req.json()) as { items: Array<{ id: string; sortOrder: number }> };
    await mediaService.reorderMedia(body.items);
    return c.json({ success: true });
  });

  return router;
}
