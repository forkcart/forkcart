import { z } from 'zod';

/** Media response from API */
export const MediaSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  path: z.string(),
  alt: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  sortOrder: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  url: z.string(),
  createdAt: z.string().datetime(),
});

export type Media = z.infer<typeof MediaSchema>;
