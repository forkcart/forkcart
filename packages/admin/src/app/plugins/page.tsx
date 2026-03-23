'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Package,
  ShoppingBag,
  CreditCard,
  Truck,
  Mail,
  BarChart3,
  Globe,
  Palette,
  Boxes,
  Check,
  X,
  Loader2,
  Settings,
  Power,
  PowerOff,
  Download,
  Star,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  type: string | null;
  isActive: boolean;
  source: string;
  settings?: { key: string; value: unknown }[];
}

interface StoreListing {
  id: string;
  name: string;
  slug: string;
  packageName: string;
  description: string | null;
  shortDescription: string | null;
  author: string | null;
  version: string;
  type: string;
  icon: string | null;
  pricing: string;
  downloads: number;
  rating: string | null;
  ratingCount: number;
  status: string;
  tags: string[];
  createdAt: string;
  versions?: { version: string; changelog: string | null; createdAt: string }[];
}

interface UpdateAvailable {
  listingId: string;
  name: string;
  slug: string;
  installedVersion: string;
  latestVersion: string;
  changelog: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  marketplace: <ShoppingBag className="h-5 w-5" />,
  notification: <Mail className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  shipping: <Truck className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  seo: <Globe className="h-5 w-5" />,
  theme: <Palette className="h-5 w-5" />,
  other: <Boxes className="h-5 w-5" />,
};

const TYPE_COLORS: Record<string, string> = {
  payment: 'bg-emerald-100 text-emerald-700',
  marketplace: 'bg-blue-100 text-blue-700',
  notification: 'bg-amber-100 text-amber-700',
  email: 'bg-amber-100 text-amber-700',
  shipping: 'bg-violet-100 text-violet-700',
  analytics: 'bg-pink-100 text-pink-700',
  seo: 'bg-cyan-100 text-cyan-700',
  theme: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

const FRIENDLY_NAMES: Record<string, string> = {
  stripe: 'Stripe Payments',
  smtp: 'SMTP Email',
  mailgun: 'Mailgun Email',
  'marketplace-amazon': 'Amazon Marketplace',
  'marketplace-ebay': 'eBay Marketplace',
  'marketplace-kaufland': 'Kaufland Marketplace',
  'marketplace-otto': 'OTTO Marketplace',
};

const DESCRIPTIONS: Record<string, string> = {
  stripe: 'Accept credit card payments via Stripe. Cards, Apple Pay, Google Pay & 135+ currencies.',
  smtp: 'Send transactional emails via any SMTP server — Gmail, Outlook, or custom.',
  mailgun: 'Reliable transactional emails via Mailgun. Supports EU and US regions.',
  'marketplace-amazon': 'Sync products to Amazon and import orders. All EU marketplaces supported.',
  'marketplace-ebay': 'List products on eBay, manage inventory and import orders.',
  'marketplace-kaufland': 'Connect to Kaufland.de — sync products and manage orders.',
  'marketplace-otto': "Sell on OTTO.de — Germany's #2 online marketplace.",
};

type TabType = 'installed' | 'store' | 'pending';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('installed');

  return (
    <div>
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
        <h1 className="text-3xl font-bold">Plugins</h1>
        <p className="mt-2 text-muted-foreground">
          Manage installed plugins, browse the store, and review submissions
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-lg border bg-muted/50 p-1">
        <TabButton
          active={activeTab === 'installed'}
          onClick={() => setActiveTab('installed')}
          icon={<Package className="h-4 w-4" />}
          label="Installed"
        />
        <TabButton
          active={activeTab === 'store'}
          onClick={() => setActiveTab('store')}
          icon={<Store className="h-4 w-4" />}
          label="Store"
        />
        <TabButton
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          icon={<Clock className="h-4 w-4" />}
          label="Pending Reviews"
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'installed' && <InstalledTab />}
        {activeTab === 'store' && <StoreTab />}
        {activeTab === 'pending' && <PendingTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Installed Tab ──────────────────────────────────────────────────────────

function InstalledTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiClient<{ data: Plugin[] }>('/plugins'),
  });

  const { data: updatesData } = useQuery({
    queryKey: ['store-updates'],
    queryFn: () => apiClient<{ data: UpdateAvailable[] }>('/store/updates'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      apiClient(`/plugins/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const allPlugins = data?.data ?? [];
  const updates = updatesData?.data ?? [];

  const plugins = allPlugins.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterStatus === 'active' && !p.isActive) return false;
    if (filterStatus === 'inactive' && p.isActive) return false;
    return true;
  });

  const activeCount = allPlugins.filter((p) => p.isActive).length;
  const types = [...new Set(allPlugins.map((p) => p.type).filter(Boolean))] as string[];

  return (
    <div>
      {/* Updates Banner */}
      {updates.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-800">
              {updates.length} update{updates.length !== 1 ? 's' : ''} available
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {updates.map((u) => (
              <p key={u.listingId} className="text-sm text-amber-700">
                <strong>{u.name}</strong>: {u.installedVersion} → {u.latestVersion}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
        >
          All ({allPlugins.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'bg-muted hover:bg-muted/80'}`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilterStatus('inactive')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === 'inactive' ? 'bg-gray-600 text-white' : 'bg-muted hover:bg-muted/80'}`}
        >
          Inactive ({allPlugins.length - activeCount})
        </button>

        <div className="mx-2 h-5 w-px bg-border" />

        <button
          onClick={() => setFilterType(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!filterType ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
        >
          All Types
        </button>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterType === type ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
          >
            {TYPE_ICONS[type] ? (
              <span className="[&>svg]:h-3 [&>svg]:w-3">{TYPE_ICONS[type]}</span>
            ) : null}
            {type}
          </button>
        ))}
      </div>

      {/* Plugin List */}
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No plugins found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? 'Try a different search term' : 'No plugins match the current filters'}
            </p>
          </div>
        ) : (
          plugins.map((plugin) => (
            <PluginRow
              key={plugin.id}
              plugin={plugin}
              onToggle={(activate) => toggleMutation.mutate({ id: plugin.id, activate })}
              toggling={toggleMutation.isPending}
              hasUpdate={updates.some((u) =>
                u.name.toLowerCase().includes(plugin.name.toLowerCase()),
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PluginRow({
  plugin,
  onToggle,
  toggling,
  hasUpdate,
}: {
  plugin: Plugin;
  onToggle: (activate: boolean) => void;
  toggling: boolean;
  hasUpdate?: boolean;
}) {
  const type = plugin.type ?? 'other';
  const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.other;
  const friendlyName = FRIENDLY_NAMES[plugin.name] ?? plugin.name;
  const description =
    DESCRIPTIONS[plugin.name] ?? plugin.description ?? 'No description available.';
  const configuredSettings = (plugin.settings ?? []).filter(
    (s) => s.value !== null && s.value !== '' && s.value !== '••••••••',
  ).length;

  return (
    <div
      className={`rounded-lg border bg-card p-5 shadow-sm transition-all ${plugin.isActive ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${plugin.isActive ? 'bg-emerald-100' : 'bg-muted'}`}
        >
          <span className={plugin.isActive ? 'text-emerald-600' : 'text-muted-foreground'}>
            {TYPE_ICONS[type] ?? <Package className="h-5 w-5" />}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{friendlyName}</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{plugin.version}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
            >
              {type}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${plugin.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {plugin.isActive ? (
                <>
                  <Check className="h-3 w-3" /> Active
                </>
              ) : (
                <>
                  <X className="h-3 w-3" /> Inactive
                </>
              )}
            </span>
            {plugin.source === 'sdk' && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                SDK
              </span>
            )}
            {hasUpdate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <ArrowUpCircle className="h-3 w-3" /> Update
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {plugin.isActive && configuredSettings > 0 && (
            <p className="mt-1 text-xs text-emerald-600">
              <Settings className="mr-1 inline h-3 w-3" />
              {configuredSettings} setting{configuredSettings !== 1 ? 's' : ''} configured
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/plugins/${plugin.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            <Settings className="h-3.5 w-3.5" /> Configure
          </Link>
          <button
            onClick={() => onToggle(!plugin.isActive)}
            disabled={toggling}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              plugin.isActive
                ? 'border border-red-200 text-red-600 hover:bg-red-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {toggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : plugin.isActive ? (
              <>
                <PowerOff className="h-3.5 w-3.5" /> Deactivate
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5" /> Activate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Store Tab ──────────────────────────────────────────────────────────────

function StoreTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['store-plugins', search, filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      params.set('limit', '50');
      return apiClient<{ data: StoreListing[]; pagination: { total: number } }>(
        `/store?${params.toString()}`,
      );
    },
  });

  const installMutation = useMutation({
    mutationFn: (slug: string) => apiClient(`/store/${slug}/install`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['store-plugins'] });
    },
  });

  const plugins = data?.data ?? [];
  const types = [
    'payment',
    'marketplace',
    'email',
    'shipping',
    'analytics',
    'seo',
    'theme',
    'other',
  ];

  return (
    <div>
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search the plugin store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Type Filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
        >
          All
        </button>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterType === type ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
          >
            {TYPE_ICONS[type] ? (
              <span className="[&>svg]:h-3 [&>svg]:w-3">{TYPE_ICONS[type]}</span>
            ) : null}
            {type}
          </button>
        ))}
      </div>

      {/* Store Grid */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No plugins in store</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? 'Try a different search term' : 'The plugin store is empty'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plugins.map((plugin) => (
              <StorePluginCard
                key={plugin.id}
                plugin={plugin}
                onInstall={() => installMutation.mutate(plugin.slug)}
                installing={installMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StorePluginCard({
  plugin,
  onInstall,
  installing,
}: {
  plugin: StoreListing;
  onInstall: () => void;
  installing: boolean;
}) {
  const type = plugin.type ?? 'other';
  const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.other;

  return (
    <div className="flex flex-col rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {TYPE_ICONS[type] ?? <Package className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{plugin.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plugin.author ?? 'Unknown'} · v{plugin.version}
          </p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm text-muted-foreground line-clamp-2">
        {plugin.shortDescription ?? plugin.description ?? 'No description'}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
        >
          {type}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          {plugin.pricing}
        </span>
        {plugin.rating && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
            <Star className="h-3 w-3 fill-amber-500" />
            {parseFloat(plugin.rating).toFixed(1)}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Download className="h-3 w-3" />
          {plugin.downloads}
        </span>
      </div>

      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {installing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Download className="h-4 w-4" /> Install
          </>
        )}
      </button>
    </div>
  );
}

// ─── Pending Reviews Tab ────────────────────────────────────────────────────

function PendingTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['store-pending'],
    queryFn: () => apiClient<{ data: StoreListing[] }>('/store/pending'),
  });

  const approveMutation = useMutation({
    mutationFn: (slug: string) => apiClient(`/store/${slug}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pending'] });
      queryClient.invalidateQueries({ queryKey: ['store-plugins'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (slug: string) =>
      apiClient(`/store/${slug}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected by admin' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pending'] });
    },
  });

  const pending = data?.data ?? [];

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500/50" />
          <h3 className="mt-4 text-lg font-medium">All caught up!</h3>
          <p className="mt-1 text-sm text-muted-foreground">No plugins pending review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((plugin) => (
            <PendingPluginRow
              key={plugin.id}
              plugin={plugin}
              onApprove={() => approveMutation.mutate(plugin.slug)}
              onReject={() => rejectMutation.mutate(plugin.slug)}
              loading={approveMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingPluginRow({
  plugin,
  onApprove,
  onReject,
  loading,
}: {
  plugin: StoreListing;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const type = plugin.type ?? 'other';
  const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.other;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <span className="text-amber-600">
            {TYPE_ICONS[type] ?? <Package className="h-5 w-5" />}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{plugin.name}</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{plugin.version}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
            >
              {type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <Clock className="h-3 w-3" /> In Review
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {plugin.shortDescription ?? plugin.description ?? 'No description'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            by {plugin.author ?? 'Unknown'} · {plugin.packageName} · submitted{' '}
            {new Date(plugin.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onApprove}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </>
            )}
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
