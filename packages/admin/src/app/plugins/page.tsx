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
  shortDescription: string | null;
  description: string | null;
  author: string | null;
  version: string;
  type: string;
  icon: string | null;
  pricing: string;
  downloads: number;
  rating: string | null;
  ratingCount: number;
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

type TabType = 'installed' | 'store';

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('installed');

  return (
    <div>
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
        <h1 className="text-3xl font-bold">Plugins</h1>
        <p className="mt-2 text-muted-foreground">
          Manage installed plugins and browse the ForkCart Plugin Store
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b">
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
          label="Plugin Store"
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'installed' && <InstalledTab />}
        {activeTab === 'store' && <StoreTab />}
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
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      apiClient(`/plugins/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const allPlugins = data?.data ?? [];
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
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search installed plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Filters */}
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
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterType === type ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Plugin List */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No plugins found"
            description={search ? 'Try a different search term' : 'No plugins match the filters'}
          />
        ) : (
          plugins.map((plugin) => (
            <InstalledPluginRow
              key={plugin.id}
              plugin={plugin}
              onToggle={(activate) => toggleMutation.mutate({ id: plugin.id, activate })}
              toggling={toggleMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

function InstalledPluginRow({
  plugin,
  onToggle,
  toggling,
}: {
  plugin: Plugin;
  onToggle: (activate: boolean) => void;
  toggling: boolean;
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

  const { data, isLoading } = useQuery({
    queryKey: ['store-plugins', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '50');
      return apiClient<{ data: StoreListing[] }>(`/store?${params}`);
    },
  });

  const installMutation = useMutation({
    mutationFn: (slug: string) => apiClient(`/store/${slug}/install`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const plugins = data?.data ?? [];

  return (
    <div>
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search the plugin store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Info Banner */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          Browse plugins from the{' '}
          <a
            href="https://forkcart.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            ForkCart Plugin Store
          </a>
          . All plugins are reviewed and approved by the ForkCart team before being listed here.
        </p>
      </div>

      {/* Plugin Grid */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          <EmptyState
            icon={<Store className="h-12 w-12" />}
            title="No plugins available yet"
            description="The ForkCart Plugin Store is coming soon. Check back later!"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  const rating = plugin.rating ? parseFloat(plugin.rating) : 0;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          <span className="text-muted-foreground">
            {TYPE_ICONS[type] ?? <Package className="h-5 w-5" />}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{plugin.name}</h3>
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
            >
              {type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            by {plugin.author ?? 'Unknown'} · v{plugin.version}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {plugin.shortDescription ?? plugin.description ?? 'No description available.'}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {plugin.ratingCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({plugin.ratingCount})</span>
            </div>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {plugin.downloads.toLocaleString()}
          </span>
        </div>

        <button
          onClick={onInstall}
          disabled={installing}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {installing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Download className="h-3.5 w-3.5" /> Install
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto text-muted-foreground/50">{icon}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
