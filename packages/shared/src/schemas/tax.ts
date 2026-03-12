import { z } from 'zod';

// ─── Tax Class ────────────────────────────────────────────────────────────────

export const CreateTaxClassSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateTaxClassInput = z.infer<typeof CreateTaxClassSchema>;

export const UpdateTaxClassSchema = CreateTaxClassSchema.partial();
export type UpdateTaxClassInput = z.infer<typeof UpdateTaxClassSchema>;

// ─── Tax Zone ─────────────────────────────────────────────────────────────────

export const CreateTaxZoneSchema = z.object({
  name: z.string().min(1).max(255),
  countries: z.array(z.string().length(2)).default([]),
  states: z.array(z.string().min(2).max(10)).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateTaxZoneInput = z.infer<typeof CreateTaxZoneSchema>;

export const UpdateTaxZoneSchema = CreateTaxZoneSchema.partial();
export type UpdateTaxZoneInput = z.infer<typeof UpdateTaxZoneSchema>;

// ─── Tax Rule ─────────────────────────────────────────────────────────────────

export const CreateTaxRuleSchema = z.object({
  name: z.string().min(1).max(255),
  taxClassId: z.string().uuid().nullable().optional(),
  taxZoneId: z.string().uuid().nullable().optional(),
  country: z.string().length(2).optional(),
  state: z.string().max(100).optional(),
  /** Rate as decimal, e.g. 0.19 for 19% */
  rate: z.string().regex(/^\d+\.?\d*$/, 'Rate must be a decimal number'),
  priority: z.number().int().min(0).default(0),
  taxType: z.string().max(50).default('VAT'),
  isCompound: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateTaxRuleInput = z.infer<typeof CreateTaxRuleSchema>;

export const UpdateTaxRuleSchema = CreateTaxRuleSchema.partial();
export type UpdateTaxRuleInput = z.infer<typeof UpdateTaxRuleSchema>;

// ─── Tax Calculation Request ──────────────────────────────────────────────────

export const TaxCalculationItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  /** Unit price in cents */
  unitPrice: z.number().int().min(0),
  /** Optional override for product's tax class */
  taxClassId: z.string().uuid().optional(),
});

export const TaxCalculationRequestSchema = z.object({
  items: z.array(TaxCalculationItemSchema).min(1),
  country: z.string().length(2),
  state: z.string().max(100).optional(),
  /** EU VAT ID for reverse charge */
  vatId: z.string().max(20).optional(),
});

export type TaxCalculationRequest = z.infer<typeof TaxCalculationRequestSchema>;

// ─── Tax Calculation Response ─────────────────────────────────────────────────

export interface TaxLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  taxType: string;
  taxClassName: string;
}

export interface TaxBreakdownLine {
  taxRate: number;
  taxType: string;
  taxClassName: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

export interface TaxCalculationResult {
  items: TaxLineItem[];
  breakdown: TaxBreakdownLine[];
  totalNet: number;
  totalTax: number;
  totalGross: number;
  taxInclusive: boolean;
  reverseCharge: boolean;
  currency: string;
}

// ─── VAT Validation ───────────────────────────────────────────────────────────

export const VatValidationRequestSchema = z.object({
  vatId: z.string().min(4).max(20),
});

export type VatValidationRequest = z.infer<typeof VatValidationRequestSchema>;

export interface VatValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
}

// ─── Tax Settings ─────────────────────────────────────────────────────────────

export const TaxSettingsSchema = z.object({
  taxDisplay: z.enum(['inclusive', 'exclusive']).default('inclusive'),
  defaultTaxClassId: z.string().uuid().nullable().optional(),
  pricesEnteredWithTax: z.boolean().default(true),
  enableVatValidation: z.boolean().default(false),
  defaultCountry: z.string().length(2).default('DE'),
});

export type TaxSettingsInput = z.infer<typeof TaxSettingsSchema>;

// ─── Filter ───────────────────────────────────────────────────────────────────

export const TaxRuleFilterSchema = z.object({
  taxClassId: z.string().uuid().optional(),
  taxZoneId: z.string().uuid().optional(),
  country: z.string().length(2).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type TaxRuleFilter = z.infer<typeof TaxRuleFilterSchema>;

// ─── DB Entity types ──────────────────────────────────────────────────────────

export interface TaxClass {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxRule {
  id: string;
  name: string;
  taxClassId: string | null;
  taxZoneId: string | null;
  country: string | null;
  state: string | null;
  rate: string;
  priority: number;
  taxType: string;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  taxClass?: TaxClass | null;
  taxZone?: TaxZone | null;
}

export interface TaxSettings {
  id: string;
  taxDisplay: string;
  defaultTaxClassId: string | null;
  pricesEnteredWithTax: boolean;
  enableVatValidation: boolean;
  defaultCountry: string;
  updatedAt: Date;
}
