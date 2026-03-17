'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Globe,
  Mail,
  Truck,
  BarChart,
  Puzzle,
  Search,
  Download,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PluginSettingSchema {
  key: string;
  type: string;
  label?: string;
  required?: boolean;
  secret?: boolean;
  default?: unknown;
  options?: string[];
  description?: string;
}

interface PluginSetting {
  key: string;
  value: unknown;
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
  settings: PluginSetting[];
  settingsSchema: PluginSettingSchema[];
  requiredSettings: unknown[];
  adminPages: unknown[];
  installedAt: string;
}

interface OfficialPlugin {
  name: string;
  package: string;
  description: string;
  type: string;
  icon: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OFFICIAL_PLUGINS: OfficialPlugin[] = [
  {
    name: 'stripe',
    package: '@forkcart/plugin-stripe',
    description: 'Accept payments via Stripe',
    type: 'payment',
    icon: 'CreditCard',
  },
  {
    name: 'mailgun',
    package: '@forkcart/plugin-mailgun',
    description: 'Send transactional emails via Mailgun',
    type: 'email',
    icon: 'Mail',
  },
  {
    name: 'smtp',
    package: '@forkcart/plugin-smtp',
    description: 'Send emails via any SMTP server',
    type: 'email',
    icon: 'Mail',
  },
  {
    name: 'marketplace-amazon',
    package: '@forkcart/plugin-marketplace-amazon',
    description: 'Sell on Amazon via SP-API',
    type: 'marketplace',
    icon: 'Globe',
  },
  {
    name: 'marketplace-ebay',
    package: '@forkcart/plugin-marketplace-ebay',
    description: 'Sell on eBay',
    type: 'marketplace',
    icon: 'Globe',
  },
  {
    name: 'marketplace-otto',
    package: '@forkcart/plugin-marketplace-otto',
    description: 'Sell on OTTO Market',
    type: 'marketplace',
    icon: 'Globe',
  },
  {
    name: 'marketplace-kaufland',
    package: '@forkcart/plugin-marketplace-kaufland',
    description: 'Sell on Kaufland',
    type: 'marketplace',
    icon: 'Globe',
  },
];

const TYPE_CONFIG: Record<string, { badge: string; icon: LucideIcon; variant: string }> = {
  payment: { badge: 'Payment', icon: CreditCard, variant: 'blue' },
  marketplace: { badge: 'Marketplace', icon: Globe, variant: 'purple' },
  email: { badge: 'Email', icon: Mail, variant: 'green' },
  shipping: { badge: 'Shipping', icon: Truck, variant: 'warning' },
  analytics: { badge: 'Analytics', icon: BarChart, variant: 'default' },
  general: { badge: 'General', icon: Puzzle, variant: 'outline' },
};

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Globe,
  Mail,
  Truck,
  BarChart,
  Puzzle,
};

function getTypeBadgeVariant(
  type: string,
): 'blue' | 'purple' | 'green' | 'warning' | 'default' | 'outline' {
  const map: Record<string, 'blue' | 'purple' | 'green' | 'warning' | 'default' | 'outline'> = {
    payment: 'blue',
    marketplace: 'purple',
    email: 'green',
    shipping: 'warning',
    analytics: 'default',
    general: 'outline',
  };
  return map[type] ?? 'outline';
}

function PluginTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['general']!;
  const Icon = config.icon;
  return (
    <Badge variant={getTypeBadgeVariant(type)}>
      <Icon className="mr-1 h-3 w-3" />
      {config.badge}
    </Badge>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PluginsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [npmPackage, setNpmPackage] = useState('');
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────

  const {
    data: pluginsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiClient<{ data: Plugin[] }>('/plugins'),
  });

  const plugins = pluginsData?.data ?? [];

  // ─── Mutations ──────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient(`/plugins/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Failed to toggle plugin');
    },
  });

  const installMutation = useMutation({
    mutationFn: (packageName: string) =>
      apiClient<{ data: { success: boolean; pluginId: string; name: string } }>(
        '/plugins/install',
        {
          method: 'POST',
          body: JSON.stringify({ packageName }),
        },
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      setNpmPackage('');
      showToast('success', `Plugin "${res.data.name}" installed`);
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Installation failed');
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/plugins/${id}/uninstall`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      setConfirmUninstall(null);
      showToast('success', 'Plugin uninstalled');
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Uninstall failed');
    },
  });

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Marketplace helpers ────────────────────────────────────────────────

  const installedNames = new Set(plugins.map((p) => p.name));

  const filteredMarketplacePlugins = OFFICIAL_PLUGINS.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Plugins</h1>
        <p className="mt-1 text-muted-foreground">
          Install, configure, and manage plugins for your store
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'mt-4 flex items-center gap-2 rounded-md p-3 text-sm',
            toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('installed')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'installed'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Installed
          {plugins.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {plugins.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'marketplace'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Marketplace
        </button>
      </div>

      {/* Installed Tab */}
      {activeTab === 'installed' && (
        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading plugins...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
              Failed to load plugins. Please try again.
            </div>
          )}

          {!isLoading && !error && plugins.length === 0 && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold">No plugins installed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse the Marketplace tab to find and install plugins.
              </p>
              <button
                onClick={() => setActiveTab('marketplace')}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Browse Marketplace
              </button>
            </div>
          )}

          {!isLoading && !error && plugins.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  onClick={() => router.push(`/plugins/${plugin.id}`)}
                  className="group cursor-pointer rounded-lg border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          plugin.isActive ? 'bg-green-100' : 'bg-muted',
                        )}
                      >
                        {(() => {
                          const config = TYPE_CONFIG[plugin.type] ?? TYPE_CONFIG['general']!;
                          const Icon = config.icon;
                          return (
                            <Icon
                              className={cn(
                                'h-5 w-5',
                                plugin.isActive ? 'text-green-600' : 'text-muted-foreground',
                              )}
                            />
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold group-hover:text-primary">
                          {plugin.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">v{plugin.version}</p>
                      </div>
                    </div>

                    {/* Active indicator */}
                    <div
                      className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full',
                        plugin.isActive ? 'bg-green-500' : 'bg-gray-300',
                      )}
                      title={plugin.isActive ? 'Active' : 'Inactive'}
                    />
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {plugin.description ?? 'No description'}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <PluginTypeBadge type={plugin.type} />

                    <div className="flex items-center gap-2">
                      {/* Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMutation.mutate({
                            id: plugin.id,
                            isActive: !plugin.isActive,
                          });
                        }}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          plugin.isActive ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                            plugin.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]',
                          )}
                        />
                      </button>

                      {/* Uninstall */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUninstall(plugin.id);
                        }}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Uninstall"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {plugin.author && (
                    <p className="mt-2 text-xs text-muted-foreground/60">by {plugin.author}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <div className="mt-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Plugin grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMarketplacePlugins.map((plugin) => {
              const isInstalled = installedNames.has(plugin.name);
              const Icon = ICON_MAP[plugin.icon] ?? Puzzle;

              return (
                <div key={plugin.name} className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{plugin.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground/60">{plugin.package}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">{plugin.description}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <PluginTypeBadge type={plugin.type} />

                    {isInstalled ? (
                      <Badge variant="success">Installed</Badge>
                    ) : (
                      <button
                        onClick={() => installMutation.mutate(plugin.package)}
                        disabled={installMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {installMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Install
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMarketplacePlugins.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No plugins match your search.
            </div>
          )}

          {/* Install from npm */}
          <div className="mt-8 rounded-lg border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Install from npm</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Install a custom plugin by entering its npm package name.
            </p>
            <div className="mt-3 flex gap-3">
              <Input
                placeholder="@forkcart/plugin-example or forkcart-plugin-custom"
                value={npmPackage}
                onChange={(e) => setNpmPackage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && npmPackage.trim()) {
                    installMutation.mutate(npmPackage.trim());
                  }
                }}
                className="flex-1"
              />
              <button
                onClick={() => {
                  if (npmPackage.trim()) {
                    installMutation.mutate(npmPackage.trim());
                  }
                }}
                disabled={!npmPackage.trim() || installMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {installMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uninstall confirmation modal */}
      {confirmUninstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Uninstall Plugin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to uninstall this plugin? This action cannot be undone. All
              plugin settings will be removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmUninstall(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => uninstallMutation.mutate(confirmUninstall)}
                disabled={uninstallMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {uninstallMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Uninstall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
