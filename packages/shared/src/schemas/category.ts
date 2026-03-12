import { z } from 'zod';

/** Create category input */
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  }),
  description: z.string().max(5000).optional(),
  parentId: z.string().uuid().nullable().default(null),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

/** Update category input */
export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

/** Category response */
export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Category = z.infer<typeof CategorySchema>;

/** Category with children (tree structure) */
export type CategoryTree = z.infer<typeof CategorySchema> & {
  children: CategoryTree[];
};

export const CategoryTreeSchema: z.ZodType<CategoryTree> = CategorySchema.extend({
  children: z.lazy(() => z.array(CategoryTreeSchema)),
}) as z.ZodType<CategoryTree>;
