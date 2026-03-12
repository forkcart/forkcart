'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Package, MapPin, UserCircle, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { customer, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="container-page py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Account</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back, {customer?.firstName}!</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/account/orders"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <Package className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              {customer?.orderCount ?? 0} orders · {((customer?.totalSpent ?? 0) / 100).toFixed(2)}{' '}
              € spent
            </p>
          </Link>

          <Link
            href="/account/addresses"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <MapPin className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">Addresses</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your shipping addresses</p>
          </Link>

          <Link
            href="/account/profile"
            className="rounded-lg border p-6 transition hover:border-gray-400 hover:shadow-sm"
          >
            <UserCircle className="h-8 w-8 text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">Profile</h2>
            <p className="mt-1 text-sm text-gray-500">{customer?.email}</p>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
