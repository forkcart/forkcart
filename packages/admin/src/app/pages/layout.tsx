'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Page builder editor (/pages/[id]) gets fullwidth — no sidebar
  const isEditor = /^\/pages\/[^/]+$/.test(pathname);

  if (isEditor) {
    return (
      <AuthGuard>
        <div className="flex h-screen flex-col">{children}</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30">{children}</main>
      </div>
    </AuthGuard>
  );
}
