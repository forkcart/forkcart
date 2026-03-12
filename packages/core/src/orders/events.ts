/** Order domain events */
export const ORDER_EVENTS = {
  CREATED: 'order.created',
  UPDATED: 'order.updated',
  STATUS_CHANGED: 'order.status_changed',
  CANCELLED: 'order.cancelled',
} as const;
