'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/config';

interface PluginNavPage {
  path: string;
  title: string;
  navLabel?: string;
  navIcon?: string;
}

interface PagesResponse {
  data: Array<{
    path: string;
    title: string;
    showInNav?: boolean;
    navLabel?: string;
    navIcon?: string;
  }>;
}

/**
 * Fetch plugin storefront pages that have showInNav=true.
 * Returns an array of pages to render as nav links.
 */
export function usePluginNavPages(): PluginNavPage[] {
  const [pages, setPages] = useState<PluginNavPage[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPages() {
      try {
        const res = await fetch(`${API_URL}/api/v1/public/plugins/pages`);
        if (!res.ok) return;

        const json = (await res.json()) as PagesResponse;
        if (cancelled) return;

        const navPages = (json.data ?? [])
          .filter((p) => p.showInNav)
          .map((p) => ({
            path: p.path,
            title: p.title,
            navLabel: p.navLabel,
            navIcon: p.navIcon,
          }));

        setPages(navPages);
      } catch {
        // Silently fail — missing pages shouldn't break the header
      }
    }

    fetchPages();
    return () => {
      cancelled = true;
    };
  }, []);

  return pages;
}
