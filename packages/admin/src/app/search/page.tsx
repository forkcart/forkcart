'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, AlertTriangle, TrendingUp, MousePointerClick } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
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

  const stats = analytics?.data;
  const zeros = zeroResults?.data ?? [];

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
        </>
      ) : null}
    </div>
  );
}
