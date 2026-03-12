'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

interface CustomerDetail extends Customer {
  addresses: Array<{
    id: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>;
  orders: CustomerOrder[];
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'outline',
};

function CustomerDetailPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => apiClient<{ data: CustomerDetail }>(`/customers/${customerId}`),
  });

  if (isLoading) return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Loading…</div>;
  if (!data) return null;

  const customer = data.data;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{customer.firstName} {customer.lastName}</h2>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕ Close</button>
      </div>

      {/* Contact Info */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium">{customer.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm font-medium">{customer.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-sm font-medium">{customer.orderCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-sm font-medium">{formatPrice(customer.totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Marketing</p>
          <Badge variant={customer.acceptsMarketing ? 'success' : 'outline'}>
            {customer.acceptsMarketing ? 'Opted in' : 'Opted out'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Customer since</p>
          <p className="text-sm font-medium">{new Date(customer.createdAt).toLocaleDateString('de-DE')}</p>
        </div>
      </div>

      {/* Addresses */}
      {customer.addresses.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Addresses</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {customer.addresses.map((addr) => (
              <div key={addr.id} className="rounded-md border p-3 text-sm">
                {addr.isDefault && <Badge variant="default" className="mb-1">Default</Badge>}
                <p className="font-medium">{addr.firstName} {addr.lastName}</p>
                <p className="text-muted-foreground">{addr.addressLine1}</p>
                {addr.addressLine2 && <p className="text-muted-foreground">{addr.addressLine2}</p>}
                <p className="text-muted-foreground">{addr.postalCode} {addr.city}, {addr.country}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      {customer.orders.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Order History</p>
          <div className="mt-2 space-y-2">
            {customer.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>{order.status}</Badge>
                  <p className="text-sm font-medium">{formatPrice(order.total, order.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '20');
  if (search) queryParams.set('search', search);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () =>
      apiClient<{ data: Customer[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        `/customers?${queryParams.toString()}`,
      ),
  });

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="mt-1 text-muted-foreground">Manage your customer base</p>
      </div>

      {/* Search */}
      <div className="relative mt-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Detail Panel */}
      {selectedCustomerId && (
        <div className="mt-6">
          <CustomerDetailPanel customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
        </div>
      )}

      {/* Table */}
      <div className="mt-6 rounded-lg border bg-card shadow-sm">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Loading customers…</div>}
        {error && <div className="p-8 text-center text-destructive">Failed to load customers.</div>}
        {data && data.data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No customers found{search ? ` matching "${search}"` : ''}.
          </div>
        )}
        {data && data.data.length > 0 && (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium text-right">Orders</th>
                  <th className="p-4 font-medium text-right">Total Spent</th>
                  <th className="p-4 font-medium">Since</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{customer.firstName} {customer.lastName}</td>
                    <td className="p-4 text-sm text-muted-foreground">{customer.email}</td>
                    <td className="p-4 text-right text-sm">{customer.orderCount}</td>
                    <td className="p-4 text-right text-sm font-medium">{formatPrice(customer.totalSpent)}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="p-4">
                      <button onClick={() => setSelectedCustomerId(customer.id)} className="rounded p-1 hover:bg-muted">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
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
