import { z } from 'zod';

/** Product status */
export const ProductStatusSchema = z.enum(['draft', 'active', 'archived']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/** Create product input */
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must be lowercase alphanumeric with hyphens',
    }),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(1).max(100).optional(),
  status: ProductStatusSchema.default('draft'),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  currency: z.string().length(3).default('EUR'),
  trackInventory: z.boolean().default(true),
  inventoryQuantity: z.number().int().min(0).default(0),
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(['g', 'kg', 'lb', 'oz']).default('g'),
  categoryIds: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/** Update product input — all fields optional */
export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

/** Product response from API */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  shortDescription: z.string().nullable(),
  sku: z.string().nullable(),
  status: ProductStatusSchema,
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  costPrice: z.number().int().nullable(),
  currency: z.string(),
  trackInventory: z.boolean(),
  inventoryQuantity: z.number().int(),
  weight: z.number().nullable(),
  weightUnit: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

/** Product variant */
export const CreateProductVariantSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100).optional(),
  price: z.number().int().min(0).optional(),
  inventoryQuantity: z.number().int().min(0).default(0),
  attributes: z.record(z.string(), z.string()).default({}),
  sortOrder: z.number().int().default(0),
});

export type CreateProductVariantInput = z.infer<typeof CreateProductVariantSchema>;

/** Product list filter */
export const ProductFilterSchema = z.object({
  status: ProductStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductFilter = z.infer<typeof ProductFilterSchema>;
