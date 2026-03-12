import { z } from 'zod';

/** Add item to cart */
export const AddCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;

/** Update cart item quantity */
export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

/** Cart item response */
export const CartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number().int(),
  totalPrice: z.number().int(),
  productName: z.string(),
  productSlug: z.string(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

/** Cart response */
export const CartSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  sessionId: z.string().nullable(),
  items: z.array(CartItemSchema),
  subtotal: z.number().int(),
  itemCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Cart = z.infer<typeof CartSchema>;
