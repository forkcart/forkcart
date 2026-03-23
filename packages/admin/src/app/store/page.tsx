'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  Star,
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
  Loader2,
  Sparkles,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface PluginListing {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  author: string | null;
  version: string;
  type: string | null;
  icon: string | null;
  pricing: string;
  price: string | null;
  downloads: number;
  rating: string | null;
  ratingCount: number;
  tags: string[] | null;
  isFeatured: boolean;
}

interface Category {
  category: string;
  count: number;
}

interface InstalledPlugin {
  listingId: string;
  version: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  marketplace: <ShoppingBag className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  shipping: <Truck className="h-5 w-5" />,
  analytics: <BarChart3 className="h-5 w-5" />,
  seo: <Globe className="h-5 w-5" />,
  theme: <Palette className="h-5 w-5" />,
  other: <Boxes className="h-5 w-5" />,
};

const PRICING_BADGES: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-green-100 text-green-800' },
  paid: { label: 'Paid', className: 'bg-blue-100 text-blue-800' },
  freemium: { label: 'Freemium', className: 'bg-purple-100 text-purple-800' },
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

export default function PluginStorePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('downloads');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedType) params.set('type', selectedType);
    if (selectedPricing) params.set('pricing', selectedPricing);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return params.toString();
  }, [search, selectedCategory, selectedType, selectedPricing, sort, page]);

  // Queries
  const { data: pluginsData, isLoading } = useQuery({
    queryKey: ['store-plugins', queryParams],
    queryFn: () =>
      apiClient<{ data: PluginListing[]; total: number; page: number; limit: number }>(
        `/store?${queryParams}`,
      ),
  });

  const { data: featuredData } = useQuery({
    queryKey: ['store-featured'],
    queryFn: () => apiClient<{ data: PluginListing[] }>('/store/featured'),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['store-categories'],
    queryFn: () => apiClient<{ data: Category[] }>('/store/categories'),
  });

  const { data: installedData } = useQuery({
    queryKey: ['store-installed'],
    queryFn: () => apiClient<{ data: InstalledPlugin[] }>('/store/installed'),
  });

  const installMutation = useMutation({
    mutationFn: (slug: string) => apiClient(`/store/${slug}/install`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-installed'] });
      queryClient.invalidateQueries({ queryKey: ['store-plugins'] });
    },
  });

  const plugins = pluginsData?.data ?? [];
  const total = pluginsData?.total ?? 0;
  const featured = featuredData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const installedIds = new Set((installedData?.data ?? []).map((i) => i.listingId));
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
        <h1 className="text-3xl font-bold">Plugin Store</h1>
        <p className="mt-2 text-muted-foreground">
          Extend your store with plugins from the community
        </p>
        <div className="relative mt-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Featured Section */}
      {featured.length > 0 && !search && !selectedCategory && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Featured</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                installed={installedIds.has(plugin.id)}
                onInstall={() => installMutation.mutate(plugin.slug)}
                installing={installMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters + Grid */}
      <div className="mt-8 flex gap-6">
        {/* Sidebar */}
        <div className="hidden w-56 shrink-0 lg:block">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold">
              <Filter className="h-4 w-4" /> Filters
            </h3>

            {/* Categories */}
            <div className="mt-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </h4>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setPage(1);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${!selectedCategory ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => {
                      setSelectedCategory(cat.category);
                      setPage(1);
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${selectedCategory === cat.category ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                  >
                    <span className="capitalize">{cat.category}</span>
                    <span className="text-xs text-muted-foreground">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="mt-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </h4>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedType(null);
                    setPage(1);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${!selectedType ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                >
                  All Types
                </button>
                {Object.entries(TYPE_ICONS).map(([type, icon]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setPage(1);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm capitalize ${selectedType === type ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                  >
                    {icon}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="mt-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pricing
              </h4>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedPricing(null);
                    setPage(1);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${!selectedPricing ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                >
                  All
                </button>
                {Object.entries(PRICING_BADGES).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPricing(key);
                      setPage(1);
                    }}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${selectedPricing === key ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} plugin{total !== 1 ? 's' : ''} found
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border bg-card px-3 text-sm"
              >
                <option value="downloads">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>

          {/* Plugin Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : plugins.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No plugins found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {plugins.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  installed={installedIds.has(plugin.id)}
                  onInstall={() => installMutation.mutate(plugin.slug)}
                  installing={installMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PluginCard({
  plugin,
  installed,
  onInstall,
  installing,
}: {
  plugin: PluginListing;
  installed: boolean;
  onInstall: () => void;
  installing: boolean;
}) {
  const pricingBadge = PRICING_BADGES[plugin.pricing] ?? {
    label: 'Free',
    className: 'bg-green-100 text-green-800',
  };
  const rating = plugin.rating ? parseFloat(plugin.rating) : 0;

  return (
    <div className="group relative rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/store/${plugin.slug}`} className="absolute inset-0 z-0" />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          {plugin.icon ? (
            <img
              src={plugin.icon}
              alt={plugin.name}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <span className="text-muted-foreground">
              {TYPE_ICONS[plugin.type ?? 'other'] ?? <Package className="h-5 w-5" />}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{plugin.name}</h3>
            <span
              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${pricingBadge.className}`}
            >
              {pricingBadge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">by {plugin.author ?? 'Unknown'}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {plugin.shortDescription ?? 'No description available.'}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {plugin.ratingCount > 0 && <StarRating rating={rating} count={plugin.ratingCount} />}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {plugin.downloads.toLocaleString()}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!installed) onInstall();
          }}
          disabled={installed || installing}
          className={`relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            installed
              ? 'border bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {installed ? (
            <>
              <Check className="h-3.5 w-3.5" /> Installed
            </>
          ) : installing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Installing...
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" /> Install
            </>
          )}
        </button>
      </div>

      {/* Version badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          v{plugin.version}
        </span>
        {plugin.tags &&
          plugin.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
      </div>
    </div>
  );
}
