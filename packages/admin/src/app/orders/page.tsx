'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import type { Order } from '@forkcart/shared';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
};

function OrderDetailPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order {order.orderNumber}</h2>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={STATUS_VARIANT[order.status] ?? 'default'} className="mt-1">{order.status}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="mt-1 text-sm font-medium">{new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="mt-1 text-sm font-medium">{formatPrice(order.subtotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Shipping</p>
          <p className="mt-1 text-sm font-medium">{formatPrice(order.shippingTotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tax</p>
          <p className="mt-1 text-sm font-medium">{formatPrice(order.taxTotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-1 text-lg font-bold">{formatPrice(order.total, order.currency)}</p>
        </div>
      </div>
      {order.notes && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="mt-1 text-sm">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiClient<{ data: Order[]; pagination: { total: number } }>('/orders'),
  });

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="mt-1 text-muted-foreground">Manage customer orders</p>
      </div>

      {selectedOrder && (
        <div className="mt-6">
          <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Loading orders…</div>}
        {error && <div className="p-8 text-center text-destructive">Failed to load orders. Make sure the API is running.</div>}
        {data && data.data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No orders yet. Orders will appear here once customers start purchasing.
          </div>
        )}
        {data && data.data.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Order</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{order.orderNumber}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="p-4">
                    <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>{order.status}</Badge>
                  </td>
                  <td className="p-4 font-medium">{formatPrice(order.total, order.currency)}</td>
                  <td className="p-4">
                    <button onClick={() => setSelectedOrder(order)} className="rounded p-1 hover:bg-muted">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
