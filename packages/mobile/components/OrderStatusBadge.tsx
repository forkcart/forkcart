import React from 'react';
import { Badge } from './ui/Badge';
import { theme } from '@/theme';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: theme.colors.warning, label: 'Pending' },
  processing: { color: theme.colors.accent, label: 'Processing' },
  shipped: { color: '#2196F3', label: 'Shipped' },
  delivered: { color: theme.colors.success, label: 'Delivered' },
  cancelled: { color: theme.colors.error, label: 'Cancelled' },
  refunded: { color: theme.colors.textMuted, label: 'Refunded' },
};

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const info = STATUS_MAP[status.toLowerCase()] ?? {
    color: theme.colors.textSecondary,
    label: status,
  };

  return <Badge label={info.label} color={info.color} />;
}
