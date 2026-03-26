'use client';

import { useState, useMemo } from 'react';
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
  packageName: string | null;
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
  marketplace: 'bg-emerald-100 text-emerald-600',
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
      apiClient(`/plugins/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: activate }),
      }),
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

const STORE_CATEGORIES = [
  { key: 'all', label: 'All', icon: <Boxes className="h-3.5 w-3.5" /> },
  { key: 'payment', label: 'Payment', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { key: 'shipping', label: 'Shipping', icon: <Truck className="h-3.5 w-3.5" /> },
  { key: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: 'seo', label: 'SEO', icon: <Globe className="h-3.5 w-3.5" /> },
  { key: 'theme', label: 'Theme', icon: <Palette className="h-3.5 w-3.5" /> },
  { key: 'marketplace', label: 'Marketplace', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { key: 'other', label: 'Other', icon: <Package className="h-3.5 w-3.5" /> },
] as const;

function StoreTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['store-plugins'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', '50');
      return apiClient<{ data: StoreListing[] }>(`/store?${params}`);
    },
  });

  // Fetch installed plugins to cross-reference
  const { data: installedData } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiClient<{ data: Plugin[] }>('/plugins'),
  });

  const installedNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of installedData?.data ?? []) {
      names.add(p.name);
      names.add(p.name.toLowerCase());
    }
    return names;
  }, [installedData]);

  const [justInstalledSlugs, setJustInstalledSlugs] = useState<Set<string>>(new Set());
  const installMutation = useMutation({
    mutationFn: (slug: string) => apiClient(`/store/${slug}/install`, { method: 'POST' }),
    onSuccess: (_data, slug) => {
      setJustInstalledSlugs((prev) => new Set(prev).add(slug));
      queryClient.invalidateQueries({ queryKey: ['store-plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const allPlugins = data?.data ?? [];

  // Client-side filtering by search + category
  const filteredPlugins = useMemo(() => {
    return allPlugins.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.shortDescription ?? p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.author ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || p.type === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allPlugins, search, activeCategory]);

  // Featured = top-rated or most downloaded (first 3 with rating or high downloads)
  const featuredPlugins = useMemo(() => {
    return [...allPlugins]
      .sort((a, b) => {
        const rA = a.rating ? parseFloat(a.rating) : 0;
        const rB = b.rating ? parseFloat(b.rating) : 0;
        if (rB !== rA) return rB - rA;
        return b.downloads - a.downloads;
      })
      .slice(0, 3);
  }, [allPlugins]);

  const showFeatured = !search && activeCategory === 'all' && featuredPlugins.length > 0;

  return (
    <div>
      {/* Developer Commission Banner */}
      <div className="rounded-xl border border-[#10b981]/30 bg-[#d1fae5] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#065f46]">
              10% Commission — Build plugins, keep 90%
            </h3>
            <p className="mt-1 text-sm text-[#065f46]/80">
              Create plugins for ForkCart and earn money with every install. Our developer-friendly
              revenue share means you keep the lion&apos;s share.
            </p>
          </div>
          <Link
            href="/developers"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#10b981] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#065f46]"
          >
            Developer Portal →
          </Link>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plugins by name, author, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
          />
        </div>
        <Link
          href="/developers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#10b981] transition-colors hover:text-[#065f46]"
        >
          <Package className="h-4 w-4" />
          Developer Docs
        </Link>
      </div>

      {/* Category Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STORE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-[#10b981] text-white'
                : 'border border-[#e5e7eb] bg-white text-[#31363c] hover:border-[#10b981] hover:text-[#10b981]'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Section */}
      {showFeatured && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-[#10b981]" />
            <h2 className="text-sm font-semibold text-[#31363c]">Featured Plugins</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredPlugins.map((plugin) => {
              const isInstalled =
                justInstalledSlugs.has(plugin.slug) ||
                installedNames.has(plugin.packageName ?? '') ||
                installedNames.has(plugin.name) ||
                installedNames.has(plugin.slug);
              return (
                <StorePluginCard
                  key={`featured-${plugin.id}`}
                  plugin={plugin}
                  onInstall={() => installMutation.mutate(plugin.slug)}
                  installing={
                    installMutation.isPending && installMutation.variables === plugin.slug
                  }
                  installed={isInstalled}
                  featured
                />
              );
            })}
          </div>
        </div>
      )}

      {/* All Plugins Grid */}
      <div className="mt-6">
        {showFeatured && (
          <div className="mb-3 flex items-center gap-2">
            <Store className="h-4 w-4 text-[#31363c]" />
            <h2 className="text-sm font-semibold text-[#31363c]">All Plugins</h2>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPlugins.length === 0 ? (
          <EmptyState
            icon={<Store className="h-12 w-12" />}
            title={
              search || activeCategory !== 'all'
                ? 'No plugins match your filters'
                : 'No plugins available yet'
            }
            description={
              search || activeCategory !== 'all'
                ? 'Try a different search term or category'
                : 'The ForkCart Plugin Store is growing. Check back soon!'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPlugins.map((plugin) => {
              const isInstalled =
                justInstalledSlugs.has(plugin.slug) ||
                installedNames.has(plugin.packageName ?? '') ||
                installedNames.has(plugin.name) ||
                installedNames.has(plugin.slug);
              return (
                <StorePluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onInstall={() => installMutation.mutate(plugin.slug)}
                  installing={
                    installMutation.isPending && installMutation.variables === plugin.slug
                  }
                  installed={isInstalled}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function StorePluginCard({
  plugin,
  onInstall,
  installing,
  installed,
  featured,
}: {
  plugin: StoreListing;
  onInstall: () => void;
  installing: boolean;
  installed?: boolean;
  featured?: boolean;
}) {
  const type = plugin.type ?? 'other';
  const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.other;
  const rating = plugin.rating ? parseFloat(plugin.rating) : 0;
  const isFree = plugin.pricing === 'free' || plugin.pricing === '0' || !plugin.pricing;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        featured ? 'border-[#10b981]/30 ring-1 ring-[#10b981]/10' : 'border-[#e5e7eb]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f9fafb]">
          {plugin.icon ? (
            <img src={plugin.icon} alt="" className="h-7 w-7 rounded" />
          ) : (
            <span className="text-[#31363c]/50">
              {TYPE_ICONS[type] ?? <Package className="h-5 w-5" />}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#31363c]">{plugin.name}</h3>
            {featured && (
              <span className="shrink-0 rounded bg-[#d1fae5] px-1.5 py-0.5 text-[10px] font-medium text-[#065f46]">
                Featured
              </span>
            )}
          </div>
          <p className="text-xs text-[#31363c]/60">
            by {plugin.author ?? 'Unknown'} · v{plugin.version}
          </p>
        </div>

        {/* Price Badge */}
        <span
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
            isFree ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#f9fafb] text-[#31363c]'
          }`}
        >
          {isFree ? 'Free' : plugin.pricing}
        </span>
      </div>

      {/* Type Badge */}
      <div className="mt-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${typeColor}`}
        >
          {TYPE_ICONS[type] ? (
            <span className="[&>svg]:h-3 [&>svg]:w-3">{TYPE_ICONS[type]}</span>
          ) : null}
          {type}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2.5 line-clamp-2 text-sm text-[#31363c]/70">
        {plugin.shortDescription ?? plugin.description ?? 'No description available.'}
      </p>

      {/* Rating + Downloads + Install */}
      <div className="mt-4 flex items-center justify-between border-t border-[#e5e7eb] pt-3">
        <div className="flex items-center gap-3">
          {plugin.ratingCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <RatingStars rating={rating} />
              <span className="text-xs font-medium text-[#31363c]">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-[#31363c]/50">({plugin.ratingCount})</span>
            </div>
          ) : (
            <span className="text-[10px] text-[#31363c]/40">No ratings yet</span>
          )}
          <span className="flex items-center gap-1 text-xs text-[#31363c]/50">
            <Download className="h-3 w-3" />
            {plugin.downloads.toLocaleString()}
          </span>
        </div>

        {!isFree && !installed ? (
          <a
            href={`https://forkcart.com/store/${plugin.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#065f46]"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Buy on forkcart.com
          </a>
        ) : (
          <button
            onClick={onInstall}
            disabled={installing || installed}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              installed
                ? 'bg-[#d1fae5] text-[#065f46]'
                : 'bg-[#10b981] text-white hover:bg-[#065f46]'
            }`}
          >
            {installing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : installed ? (
              <>
                <Check className="h-3.5 w-3.5" /> Installed
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Install
              </>
            )}
          </button>
        )}
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
