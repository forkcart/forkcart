'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Search,
  AlertTriangle,
  TrendingUp,
  MousePointerClick,
  Package,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@forkcart/shared';
import Link from 'next/link';
import { useState } from 'react';

interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgResultsCount: number;
  clickThroughRate: number;
  topQueries: Array<{ query: string; searchCount: number; avgResults: number }>;
  zeroResultQueries: Array<{ query: string; searchCount: number; lastSearched: string }>;
}

interface ZeroResultEntry {
  query: string;
  searchCount: number;
  lastSearched: string;
}

interface QueryCTREntry {
  query: string;
  searches: number;
  clicks: number;
  ctrPercent: number;
}

interface TopClickedProductEntry {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  clickCount: number;
  uniqueQueries: number;
}

interface QueryProductEntry {
  query: string;
  productId: string;
  productName: string;
  slug: string;
  clicks: number;
}

interface RankingScoreEntry {
  productId: string;
  name: string;
  slug: string;
  ctrBoost: number;
  conversionScore: number;
  recencyBoost: number;
  discountBoost: number;
  outOfStockPenalty: number;
  popularityScore: number;
  totalBoost: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-block rounded px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
        0
      </span>
    );
  }
  const isPositive = value > 0;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs tabular-nums ${
        isPositive
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {isPositive ? '+' : ''}
      {value.toFixed(3)}
    </span>
  );
}

export default function SearchAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['search-analytics', days],
    queryFn: () => apiClient<{ data: SearchAnalytics }>(`/search/analytics?days=${days}`),
  });

  const { data: zeroResults } = useQuery({
    queryKey: ['search-zero-results', days],
    queryFn: () =>
      apiClient<{ data: ZeroResultEntry[] }>(`/search/zero-results?days=${days}&limit=30`),
  });

  const { data: ctrData } = useQuery({
    queryKey: ['search-ctr', days],
    queryFn: () => apiClient<{ data: QueryCTREntry[] }>(`/search/analytics/ctr?days=${days}`),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['search-top-products', days],
    queryFn: () =>
      apiClient<{ data: TopClickedProductEntry[] }>(`/search/analytics/top-products?days=${days}`),
  });

  const { data: queryProducts } = useQuery({
    queryKey: ['search-query-products', days],
    queryFn: () =>
      apiClient<{ data: QueryProductEntry[] }>(`/search/analytics/query-products?days=${days}`),
  });

  const { data: rankings } = useQuery({
    queryKey: ['search-rankings'],
    queryFn: () => apiClient<{ data: RankingScoreEntry[] }>('/search/analytics/rankings?limit=20'),
  });

  const stats = analytics?.data;
  const zeros = zeroResults?.data ?? [];
  const ctrRows = ctrData?.data ?? [];
  const topClickedProducts = topProducts?.data ?? [];
  const queryProductRows = queryProducts?.data ?? [];
  const rankingRows = rankings?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track what your customers are searching for
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Searches" value={stats.totalSearches} icon={Search} />
            <StatCard label="Unique Queries" value={stats.uniqueQueries} icon={TrendingUp} />
            <StatCard label="Avg. Results" value={stats.avgResultsCount.toFixed(1)} icon={Search} />
            <StatCard
              label="Click-Through Rate"
              value={`${(stats.clickThroughRate * 100).toFixed(1)}%`}
              icon={MousePointerClick}
            />
          </div>

          {/* Top Queries Table */}
          <div className="rounded-lg border">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Top Search Queries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Query</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Searches
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Avg. Results
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topQueries.map((row, idx) => (
                    <tr key={row.query} className="border-b last:border-0">
                      <td className="px-6 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-6 py-3 font-medium">{row.query}</td>
                      <td className="px-6 py-3 text-right">{row.searchCount}</td>
                      <td className="px-6 py-3 text-right">{row.avgResults.toFixed(1)}</td>
                    </tr>
                  ))}
                  {stats.topQueries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No search data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zero-Result Queries */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <h2 className="font-semibold">Zero-Result Searches</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Users searched for these but got no results
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Query</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Times Searched
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Last Searched
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zeros.map((row) => (
                    <tr key={row.query} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">{row.query}</td>
                      <td className="px-6 py-3 text-right">{row.searchCount}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {new Date(row.lastSearched).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                  {zeros.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        No zero-result searches — great!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Query Click-Through Rates */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <MousePointerClick className="h-4 w-4 text-emerald-500" />
              <h2 className="font-semibold">Query Click-Through Rates</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Query</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Searches
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Clicks
                    </th>
                    <th className="min-w-[140px] px-6 py-3 text-right font-medium text-muted-foreground">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ctrRows.map((row) => (
                    <tr key={row.query} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">{row.query}</td>
                      <td className="px-6 py-3 text-right">{row.searches}</td>
                      <td className="px-6 py-3 text-right">{row.clicks}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs tabular-nums">{row.ctrPercent}%</span>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                row.ctrPercent >= 20
                                  ? 'bg-green-500'
                                  : row.ctrPercent >= 5
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, row.ctrPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ctrRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No CTR data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Clicked Products */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <Package className="h-4 w-4 text-green-500" />
              <h2 className="font-semibold">Most Clicked Products</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Product
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Unique Queries
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topClickedProducts.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-6 py-3">
                        <Link
                          href={`/products/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                        <span className="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                          {formatPrice(row.price, row.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">{row.clickCount}</td>
                      <td className="px-6 py-3 text-right">{row.uniqueQueries}</td>
                    </tr>
                  ))}
                  {topClickedProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        No product click data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Search → Product Mapping */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <ArrowRight className="h-4 w-4 text-purple-500" />
              <h2 className="font-semibold">Search → Product Mapping</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Which queries lead to which product clicks
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Query → Product
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Clicks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const grouped = new Map<string, QueryProductEntry[]>();
                    for (const row of queryProductRows) {
                      const existing = grouped.get(row.query) ?? [];
                      existing.push(row);
                      grouped.set(row.query, existing);
                    }
                    const elements: React.ReactNode[] = [];
                    for (const [query, entries] of grouped) {
                      elements.push(
                        <tr key={`q-${query}`} className="border-b bg-muted/30">
                          <td className="px-6 py-2 font-semibold" colSpan={2}>
                            &ldquo;{query}&rdquo;
                          </td>
                        </tr>,
                      );
                      for (const entry of entries) {
                        elements.push(
                          <tr
                            key={`${query}-${entry.productId}`}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pl-12 pr-6">
                              <Link
                                href={`/products/${entry.productId}`}
                                className="text-primary hover:underline"
                              >
                                {entry.productName}
                              </Link>
                            </td>
                            <td className="px-6 py-2 text-right">{entry.clicks}</td>
                          </tr>,
                        );
                      }
                    }
                    return elements.length > 0 ? (
                      elements
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">
                          No query-product mapping data yet
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Ranking Scores */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold">Product Ranking Scores</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                Score breakdown for search result ordering
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Product
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Score
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">CTR</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Conv.
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Recency
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Popular.
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row) => (
                    <tr key={row.productId} className="border-b last:border-0">
                      <td className="px-6 py-3">
                        <Link
                          href={`/products/${row.productId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums">
                        {row.totalBoost.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={row.ctrBoost} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={row.conversionScore} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={row.recencyBoost} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={row.discountBoost} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={row.popularityScore} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ScoreBadge value={-row.outOfStockPenalty} />
                      </td>
                    </tr>
                  ))}
                  {rankingRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                        No ranking data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
