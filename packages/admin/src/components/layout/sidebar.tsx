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
  Tag,
  UserCog,
  Star,
  FileText,
  CircleDollarSign,
  Layers,
  Smartphone,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeToken } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { useAuth, type AdminRole } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** If set, only these roles see the item. If undefined, everyone sees it. */
  roles?: AdminRole[];
  /** Visual group separator before this item */
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/attributes', label: 'Attributes', icon: Layers },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/coupons', label: 'Coupons', icon: Tag, roles: ['admin', 'superadmin'] },
  { href: '/pages', label: 'Pages', icon: FileText },
  {
    href: '/currencies',
    label: 'Currencies',
    icon: CircleDollarSign,
    roles: ['admin', 'superadmin'],
  },
  { href: '/reviews', label: 'Reviews', icon: Star, roles: ['admin', 'superadmin'] },
  {
    href: '/marketplace',
    label: 'Marketplaces',
    icon: Globe,
    roles: ['admin', 'superadmin'],
    group: 'Channels',
  },
  {
    href: '/mobile-app',
    label: 'Mobile App',
    icon: Smartphone,
    roles: ['admin', 'superadmin'],
  },
  {
    href: '/plugins',
    label: 'Plugins',
    icon: Puzzle,
    roles: ['admin', 'superadmin'],
    group: 'System',
  },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'superadmin'] },
  { href: '/users', label: 'Users', icon: UserCog, roles: ['superadmin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole } = useAuth();

  async function handleLogout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors — we're logging out anyway
    }
    removeToken();
    router.push('/login');
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && hasRole(...item.roles)));

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Store className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">ForkCart</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map(({ href, label, icon: Icon, group }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <div key={href}>
              {group && (
                <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group}
                </p>
              )}
              <Link
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
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        {user && (
          <Link
            href="/account"
            className={cn(
              'mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/account'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <UserCog className="h-4 w-4" />
            {user.firstName} {user.lastName}
          </Link>
        )}
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
