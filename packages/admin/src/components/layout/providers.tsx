'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { RebuildBanner } from '@/components/layout/rebuild-banner';
import { UpdateBanner } from '@/components/layout/update-banner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UpdateBanner />
        <RebuildBanner />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
