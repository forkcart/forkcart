import { z } from 'zod';

/** Meta tags for a product */
export const MetaTagsSchema = z.object({
  metaTitle: z.string().max(255),
  metaDescription: z.string().max(500),
  metaKeywords: z.string().max(1000).optional(),
  ogImage: z.string().url().optional(),
});

export type MetaTags = z.infer<typeof MetaTagsSchema>;

/** SEO settings key-value */
export const SeoSettingSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.string(),
});

export type SeoSetting = z.infer<typeof SeoSettingSchema>;

/** Update SEO settings — map of key/value pairs */
export const UpdateSeoSettingsSchema = z.record(z.string().min(1).max(255), z.string());
export type UpdateSeoSettingsInput = z.infer<typeof UpdateSeoSettingsSchema>;

/** Bulk generate request */
export const BulkGenerateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
});
export type BulkGenerateInput = z.infer<typeof BulkGenerateSchema>;

/** SEO analysis result */
export const SeoAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.enum(['error', 'warning', 'info']),
      message: z.string(),
      field: z.string().optional(),
    }),
  ),
  suggestions: z.array(z.string()),
});

export type SeoAnalysis = z.infer<typeof SeoAnalysisSchema>;

/** Product SEO status */
export const ProductSeoStatusSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  hasMetaTitle: z.boolean(),
  hasMetaDescription: z.boolean(),
  hasMetaKeywords: z.boolean(),
  hasOgImage: z.boolean(),
  altTextCoverage: z.number().min(0).max(100),
  score: z.enum(['good', 'partial', 'missing']),
});

export type ProductSeoStatus = z.infer<typeof ProductSeoStatusSchema>;
