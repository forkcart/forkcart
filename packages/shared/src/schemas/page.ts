import { z } from 'zod';

/** Page status */
export const PageStatusSchema = z.enum(['draft', 'published', 'archived']);
export type PageStatus = z.infer<typeof PageStatusSchema>;

/** Create page input */
export const CreatePageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must be lowercase alphanumeric with hyphens',
    }),
  status: PageStatusSchema.default('draft'),
  content: z.unknown().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(500).optional(),
  isHomepage: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export type CreatePageInput = z.infer<typeof CreatePageSchema>;

/** Update page input — all fields optional */
export const UpdatePageSchema = CreatePageSchema.partial();
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;

/** Page filter */
export const PageFilterSchema = z.object({
  status: PageStatusSchema.optional(),
});

export type PageFilter = z.infer<typeof PageFilterSchema>;
