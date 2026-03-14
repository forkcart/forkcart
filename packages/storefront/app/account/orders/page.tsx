'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@forkcart/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChevronLeft, Loader2, Package } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
}

export default function OrdersPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/v1/customer-auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(async (profile) => {
        const res = await fetch(`${API_URL}/api/v1/storefront/customers/${profile.data.id}/orders`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.data ?? []);
        }
      })
      .catch((error: unknown) => {
        console.error('[Orders] Failed to load order history:', error);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <ProtectedRoute>
      <div className="container-page py-12">
        <Link
          href="/account"
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> {t('account.backToAccount')}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('account.orders')}</h1>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">{t('account.noOrders')}</p>
            <Link
              href="/category/all"
              className="mt-4 inline-flex rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {t('account.startShopping')}
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                      {order.status}
                    </span>
                    <p className="mt-1 font-semibold">{formatPrice(order.total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
