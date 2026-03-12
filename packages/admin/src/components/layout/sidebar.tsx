'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Puzzle,
  Settings,
  LogOut,
  Store,
  Truck,
  Mail,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeToken } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/shipping', label: 'Versand', icon: Truck },
  { href: '/tax', label: 'Steuern', icon: Calculator },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/plugins', label: 'Plugins', icon: Puzzle },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors — we're logging out anyway
    }
    removeToken();
    router.push('/login');
  }

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Store className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">ForkCart</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
