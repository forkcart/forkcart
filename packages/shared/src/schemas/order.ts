import { z } from 'zod';

/** Order status state machine */
export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Valid status transitions */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Order item input */
export const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0),
  totalPrice: z.number().int().min(0),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

/** Create order input */
export const CreateOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  guestEmail: z.string().email().optional(),
  guestFirstName: z.string().max(100).optional(),
  guestLastName: z.string().max(100).optional(),
  items: z.array(OrderItemSchema).min(1),
  shippingAddressId: z.string().uuid().optional(),
  billingAddressId: z.string().uuid().optional(),
  shippingMethodId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

/** Order response */
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid().nullable(),
  guestEmail: z.string().email().nullable().optional(),
  guestFirstName: z.string().nullable().optional(),
  guestLastName: z.string().nullable().optional(),
  status: OrderStatusSchema,
  subtotal: z.number().int(),
  shippingTotal: z.number().int(),
  taxTotal: z.number().int(),
  total: z.number().int(),
  currency: z.string(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Order = z.infer<typeof OrderSchema>;
