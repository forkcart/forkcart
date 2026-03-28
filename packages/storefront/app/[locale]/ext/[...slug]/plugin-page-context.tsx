'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

declare global {
  interface Window {
    FORKCART?: Record<string, unknown>;
  }
}

interface PluginPageContextProps {
  path: string;
  requireAuth?: boolean;
  locale: string;
}

/**
 * Client component that:
 * 1. Sets window.FORKCART context for plugin scripts
 * 2. Handles auth redirect if page requires authentication
 */
export function PluginPageContext({ path, requireAuth, locale }: PluginPageContextProps) {
  const { customer } = useAuth();
  const router = useRouter();

  // Auth redirect
  useEffect(() => {
    if (requireAuth && !customer) {
      router.replace(`/${locale}/account/login`);
    }
  }, [requireAuth, customer, router, locale]);

  // Set window.FORKCART context
  useEffect(() => {
    window.FORKCART = {
      ...(window.FORKCART ?? {}),
      pageType: 'plugin-page',
      pluginPage: path,
    };

    return () => {
      if (window.FORKCART) {
        delete window.FORKCART.pageType;
        delete window.FORKCART.pluginPage;
      }
    };
  }, [path]);

  return null;
}
