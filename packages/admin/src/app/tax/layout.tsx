'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TAX_TABS = [
  { href: '/tax', label: 'Tax Classes' },
  { href: '/tax/zones', label: 'Tax Zones' },
  { href: '/tax/rules', label: 'Tax Rules' },
  { href: '/tax/settings', label: 'Settings' },
] as const;

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b">
        {TAX_TABS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
