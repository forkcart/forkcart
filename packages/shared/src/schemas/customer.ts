import { z } from 'zod';

/** Create customer input */
export const CreateCustomerSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
  acceptsMarketing: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

/** Update customer input */
export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

/** Address input */
export const AddressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(255).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(50).optional(),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof AddressSchema>;

/** Customer response */
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  acceptsMarketing: z.boolean(),
  orderCount: z.number().int(),
  totalSpent: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Customer = z.infer<typeof CustomerSchema>;
