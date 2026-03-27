'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Puzzle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PluginAdminPageDef {
  path: string;
  label: string;
  icon?: string;
  parent?: string;
  order?: number;
  hasContent: boolean;
  hasApiRoute: boolean;
}

interface PluginAdminPagesResponse {
  pluginName: string;
  pages: PluginAdminPageDef[];
}

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  type: string;
  isActive: boolean;
  source: string;
  settings: Array<{ key: string; value: unknown }>;
  settingsSchema: Array<{ key: string; type: string; label?: string }>;
  requiredSettings: unknown[];
  adminPages: PluginAdminPageDef[];
  installedAt: string;
}

interface AdminPageContentResponse {
  html: string;
  source: 'static' | 'api' | 'default';
}

// ─── Script executor (same trust model as storefront slots) ─────────────────

function executeScripts(container: HTMLElement) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    // Copy attributes
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    // Copy inline content
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PluginAdminPage() {
  const params = useParams();
  const router = useRouter();
  const pluginId = params.id as string;
  const pagePath = (params.page as string[])?.join('/') ?? '';
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch plugin details
  const { data: pluginsData, isLoading: pluginsLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiClient<{ data: Plugin[] }>('/plugins'),
  });

  // Fetch all plugin admin pages
  const { data: adminPagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['plugin-admin-pages'],
    queryFn: () => apiClient<{ data: PluginAdminPagesResponse[] }>('/plugins/admin-pages'),
  });

  const plugin = pluginsData?.data?.find((p) => p.id === pluginId);

  // Fetch the actual page content
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['plugin-admin-page-content', pluginId, pagePath],
    queryFn: () =>
      apiClient<{ data: AdminPageContentResponse }>(
        `/plugins/admin-pages/${pluginId}/content?path=/${pagePath}`,
      ),
    enabled: !!plugin?.isActive,
  });

  const isLoading = pluginsLoading || pagesLoading;

  // Find the admin pages for this plugin
  const pluginPages = adminPagesData?.data?.find((p) => p.pluginName === plugin?.name)?.pages ?? [];
  const currentPage = pluginPages.find((p) => p.path === `/${pagePath}` || p.path === pagePath);

  // Execute scripts after content is rendered
  const handleContentRender = useCallback(() => {
    if (contentRef.current && contentData?.data?.html) {
      executeScripts(contentRef.current);
    }
  }, [contentData?.data?.html]);

  useEffect(() => {
    handleContentRender();
  }, [handleContentRender]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading plugin page...
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="py-12 text-center">
        <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">Plugin not found</h3>
        <button
          onClick={() => router.push('/plugins')}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </button>
      </div>
    );
  }

  if (!plugin.isActive) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
        <h3 className="mt-4 text-lg font-semibold">Plugin is inactive</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Activate the plugin to access its admin pages.
        </p>
        <button
          onClick={() => router.push(`/plugins/${pluginId}`)}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Plugin Settings
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push(`/plugins/${pluginId}`)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {plugin.name}
      </button>

      <div className="flex gap-6">
        {/* Sidebar — plugin page navigation */}
        {pluginPages.length > 1 && (
          <nav className="w-48 shrink-0">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{plugin.name}</h3>
            <ul className="space-y-1">
              {pluginPages
                .sort((a, b) => (a.order ?? 10) - (b.order ?? 10))
                .map((page) => {
                  const isActive = page.path === `/${pagePath}` || page.path === pagePath;
                  return (
                    <li key={page.path}>
                      <button
                        onClick={() =>
                          router.push(`/plugins/${pluginId}/${page.path.replace(/^\//, '')}`)
                        }
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {page.label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>
        )}

        {/* Content area */}
        <div className="flex-1">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{currentPage?.label ?? `${plugin.name} Admin`}</h1>

            {/* Plugin-rendered content */}
            <div className="mt-6">
              {contentLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading content...
                </div>
              ) : contentData?.data?.html ? (
                <div
                  ref={contentRef}
                  className="plugin-admin-content"
                  dangerouslySetInnerHTML={{ __html: contentData.data.html }}
                />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                  <Puzzle className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No content available for this page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
