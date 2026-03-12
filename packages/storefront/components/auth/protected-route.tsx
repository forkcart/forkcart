'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customer, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !customer) {
      router.push('/account/login');
    }
  }, [customer, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return <>{children}</>;
}
