'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Eye, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface OrderCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  status: string;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  notes: string | null;
  guestEmail?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: OrderCustomer | null;
  items?: OrderItem[];
  statusHistory?: StatusHistoryEntry[];
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'destructive' | 'outline'
> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const ALL_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3">
          <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-3 w-3 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {entry.fromStatus ? (
                <>
                  <Badge variant={STATUS_VARIANT[entry.fromStatus] ?? 'default'} className="mr-1">
                    {entry.fromStatus}
                  </Badge>
                  →{' '}
                </>
              ) : null}
              <Badge variant={STATUS_VARIANT[entry.toStatus] ?? 'default'}>{entry.toStatus}</Badge>
            </p>
            {entry.note && <p className="mt-0.5 text-xs text-muted-foreground">{entry.note}</p>}
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString('de-DE')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderDetailPanel({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient<{ data: Order }>(`/orders/${orderId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; note?: string }) =>
      apiClient(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isLoading)
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!data) return null;

  const order = data.data;
  const allowedTransitions = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order {order.orderNumber}</h2>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          ✕ Close
        </button>
      </div>

      {/* Status + Actions */}
      <div className="mt-4 flex items-center gap-3">
        <Badge variant={STATUS_VARIANT[order.status] ?? 'default'} className="text-sm">
          {order.status}
        </Badge>
        {allowedTransitions.length > 0 && (
          <div className="flex gap-2">
            {allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate({ status: s })}
                disabled={statusMutation.isPending}
                className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer Info */}
      {order.customer ? (
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{order.customer.email}</p>
        </div>
      ) : order.guestEmail ? (
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <p className="text-sm font-medium">
            {order.guestFirstName} {order.guestLastName}{' '}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Guest</span>
          </p>
          <p className="text-xs text-muted-foreground">{order.guestEmail}</p>
        </div>
      ) : null}

      {/* Totals */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="text-sm font-medium">{formatPrice(order.subtotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Shipping</p>
          <p className="text-sm font-medium">{formatPrice(order.shippingTotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tax</p>
          <p className="text-sm font-medium">{formatPrice(order.taxTotal, order.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{formatPrice(order.total, order.currency)}</p>
        </div>
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Items</p>
          <div className="mt-2 space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.productName || 'Product'}</p>
                  {item.variantName && (
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                  )}
                  {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {item.quantity} × {formatPrice(item.unitPrice, order.currency)}
                  </p>
                  <p className="text-sm font-medium">
                    {formatPrice(item.totalPrice, order.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mt-4">
          <p className="text-sm font-medium">Notes</p>
          <p className="mt-1 text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}

      {/* Status Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Status History</p>
          <div className="mt-2">
            <StatusTimeline history={order.statusHistory} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', statusFilter, page],
    queryFn: () =>
      apiClient<{
        data: Order[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/orders?${queryParams.toString()}`),
  });

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="mt-1 text-muted-foreground">Manage customer orders</p>
      </div>

      {/* Status Filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${!statusFilter ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium capitalize ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedOrderId && (
        <div className="mt-6">
          <OrderDetailPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
        </div>
      )}

      {/* Table */}
      <div className="mt-6 rounded-lg border bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Loading orders…</div>}
        {error && (
          <div className="p-8 text-center text-destructive">
            Failed to load orders. Make sure the API is running.
          </div>
        )}
        {data && data.data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No orders found{statusFilter ? ` with status "${statusFilter}"` : ''}.
          </div>
        )}
        {data && data.data.length > 0 && (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Total</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{order.orderNumber}</td>
                    <td className="p-4 text-sm">
                      {order.customer
                        ? `${order.customer.firstName} ${order.customer.lastName}`
                        : order.guestEmail
                          ? `${order.guestFirstName ?? ''} ${order.guestLastName ?? ''} (Guest)`
                          : '—'}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatPrice(order.total, order.currency)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages} (
                  {data.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
