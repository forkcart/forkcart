'use client';

import { useQuery } from '@tanstack/react-query';
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';

interface OrderStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  newCustomers: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    customer?: { firstName: string; lastName: string; email: string };
  }>;
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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => apiClient<{ data: OrderStats }>('/orders/stats'),
  });

  const stats = data?.data;

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome to ForkCart Admin</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={isLoading ? '…' : formatPrice(stats?.totalRevenue ?? 0)}
          icon={TrendingUp}
          description={`${isLoading ? '…' : formatPrice(stats?.monthlyRevenue ?? 0)} this month`}
        />
        <StatCard
          title="Total Orders"
          value={isLoading ? '…' : String(stats?.totalOrders ?? 0)}
          icon={ShoppingCart}
          description={`${isLoading ? '…' : (stats?.monthlyOrders ?? 0)} this month`}
        />
        <StatCard
          title="Avg. Order Value"
          value={isLoading ? '…' : formatPrice(stats?.averageOrderValue ?? 0)}
          icon={Package}
          description="All time average"
        />
        <StatCard
          title="New Customers"
          value={isLoading ? '…' : String(stats?.newCustomers ?? 0)}
          icon={Users}
          description="Last 30 days"
        />
      </div>

      {/* Recent Orders */}
      <div className="mt-8 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        {stats && stats.recentOrders.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
        )}
        {stats && stats.recentOrders.length > 0 && (
          <div className="mt-4 space-y-3">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : 'Unknown'}{' '}
                    · {new Date(order.createdAt).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'default'}>{order.status}</Badge>
                  <p className="text-sm font-medium">{formatPrice(order.total, order.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
