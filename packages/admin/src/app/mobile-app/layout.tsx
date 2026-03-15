import { Sidebar } from '@/components/layout/sidebar';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
