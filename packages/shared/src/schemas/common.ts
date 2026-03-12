import { z } from 'zod';

/** Pagination query parameters */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/** Paginated response wrapper */
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

/** Sort direction */
export const SortDirectionSchema = z.enum(['asc', 'desc']).default('asc');

/** Standard ID parameter */
export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

/** Slug parameter */
export const SlugParamSchema = z.object({
  slug: z.string().min(1).max(255),
});

/** Money representation — stored as integer cents to avoid floating-point issues */
export const MoneySchema = z.object({
  amount: z.number().int(),
  currency: z.string().length(3).default('EUR'),
});

export type Money = z.infer<typeof MoneySchema>;

/** Standard timestamps */
export const TimestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});
