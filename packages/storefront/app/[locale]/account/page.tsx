'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LocaleLink } from '@/components/locale-link';
import { useTranslation } from '@forkcart/i18n/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Package, MapPin, UserCircle, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { customer, logout } = useAuth();
  const { t } = useTranslation();

  // Set window.FORKCART context for plugin scripts
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.FORKCART = w.FORKCART || {};
    (w.FORKCART as Record<string, unknown>).pageType = 'account';
  }, []);

  return (
    <ProtectedRoute>
      <div className="container-page py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {t('account.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('account.welcomeBack', { name: customer?.firstName ?? '' })}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            {t('account.signOut')}
          </button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <LocaleLink
            href="/account/orders"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <Package className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">{t('account.orders')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('account.ordersSpent', {
                count: customer?.orderCount ?? 0,
                amount: ((customer?.totalSpent ?? 0) / 100).toFixed(2),
              })}
            </p>
          </LocaleLink>

          <LocaleLink
            href="/account/addresses"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <MapPin className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">{t('account.addresses')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('account.manageAddresses')}</p>
          </LocaleLink>

          <LocaleLink
            href="/account/profile"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <UserCircle className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">{t('account.profile')}</h2>
            <p className="mt-1 text-sm text-gray-500">{customer?.email}</p>
          </LocaleLink>
        </div>
      </div>
    </ProtectedRoute>
  );
}
