'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Settings,
  FileText,
  Image,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

interface ProductSeoStatus {
  productId: string;
  productName: string;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasMetaKeywords: boolean;
  hasOgImage: boolean;
  altTextCoverage: number;
  score: 'good' | 'partial' | 'missing';
}

interface SeoSettings {
  [key: string]: string;
}

interface BulkResult {
  productId: string;
  success: boolean;
  error?: string;
}

function ScoreBadge({ score }: { score: 'good' | 'partial' | 'missing' }) {
  if (score === 'good') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle2 className="h-3 w-3" /> Good
      </span>
    );
  }
  if (score === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
        <AlertTriangle className="h-3 w-3" /> Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      <XCircle className="h-3 w-3" /> Missing
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function SeoPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [settingsForm, setSettingsForm] = useState<SeoSettings>({});

  const { data: overview, isLoading } = useQuery({
    queryKey: ['seo-overview'],
    queryFn: () => apiClient<{ data: ProductSeoStatus[] }>('/seo/overview'),
  });

  useQuery({
    queryKey: ['seo-settings'],
    queryFn: async () => {
      const res = await apiClient<{ data: SeoSettings }>('/seo/settings');
      setSettingsForm(res.data);
      return res;
    },
  });

  const bulkMetaMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      apiClient<{ data: BulkResult[] }>('/seo/products/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
    },
  });

  const generateMetaMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient<{ data: unknown }>(`/seo/products/${productId}/generate`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
    },
  });

  const generateAltMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient<{ data: unknown }>(`/seo/products/${productId}/alt-texts`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seo-overview'] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: SeoSettings) =>
      apiClient<{ data: SeoSettings }>('/seo/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['seo-settings'] });
    },
  });

  const products = overview?.data ?? [];
  const good = products.filter((p) => p.score === 'good').length;
  const partial = products.filter((p) => p.score === 'partial').length;
  const missing = products.filter((p) => p.score === 'missing').length;

  const handleBulkGenerate = () => {
    const ids = products.filter((p) => p.score !== 'good').map((p) => p.productId);
    if (ids.length > 0) bulkMetaMutation.mutate(ids);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO</h1>
          <p className="text-sm text-muted-foreground">Optimize your shop for search engines</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted'
            }`}
          >
            <Search className="mr-1.5 inline-block h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted'
            }`}
          >
            <Settings className="mr-1.5 inline-block h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Good" value={good} color="text-green-600" />
            <StatCard label="Partial" value={partial} color="text-yellow-600" />
            <StatCard label="Missing" value={missing} color="text-red-600" />
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleBulkGenerate}
              disabled={bulkMetaMutation.isPending || missing + partial === 0}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {bulkMetaMutation.isPending
                ? 'Generating...'
                : `Generate Meta Tags (${missing + partial} products)`}
            </button>
          </div>

          {bulkMetaMutation.isSuccess && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Bulk generation complete! {bulkMetaMutation.data.data.filter((r) => r.success).length}{' '}
              succeeded, {bulkMetaMutation.data.data.filter((r) => !r.success).length} failed.
            </div>
          )}

          {/* Product Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">Products SEO Status</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                        Product
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-muted-foreground">
                        Score
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-6 py-3 text-center font-medium text-muted-foreground">
                        Alt Texts
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.productId} className="border-b last:border-0">
                        <td className="px-6 py-3 font-medium">{product.productName}</td>
                        <td className="px-6 py-3 text-center">
                          <ScoreBadge score={product.score} />
                        </td>
                        <td className="px-6 py-3 text-center">
                          {product.hasMetaTitle ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="mx-auto h-4 w-4 text-red-400" />
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {product.hasMetaDescription ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="mx-auto h-4 w-4 text-red-400" />
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`text-xs font-medium ${
                              product.altTextCoverage >= 80
                                ? 'text-green-600'
                                : product.altTextCoverage >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {product.altTextCoverage}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => generateMetaMutation.mutate(product.productId)}
                              disabled={generateMetaMutation.isPending}
                              className="rounded p-1.5 hover:bg-muted"
                              title="Generate Meta Tags"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => generateAltMutation.mutate(product.productId)}
                              disabled={generateAltMutation.isPending}
                              className="rounded p-1.5 hover:bg-muted"
                              title="Generate Alt Texts"
                            >
                              <Image className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                          No active products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">SEO Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Shop Name</label>
                <input
                  type="text"
                  value={settingsForm['shop_name'] ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, shop_name: e.target.value }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="My Shop"
                />
                <p className="mt-1 text-xs text-muted-foreground">Used in meta title templates</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Default Meta Description Template
                </label>
                <textarea
                  value={settingsForm['default_description_template'] ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      default_description_template: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="{productName} - {shortDescription}. Jetzt bestellen."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Variables: {'{productName}'}, {'{shortDescription}'}, {'{shopName}'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Google Search Console Verification
                </label>
                <input
                  type="text"
                  value={settingsForm['google_verification'] ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      google_verification: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="google-site-verification=..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Default OG Image URL</label>
                <input
                  type="text"
                  value={settingsForm['og_default_image'] ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      og_default_image: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="https://shop.example.com/og-image.jpg"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Fallback image for social sharing when product has no image
                </p>
              </div>

              <button
                onClick={() => saveSettingsMutation.mutate(settingsForm)}
                disabled={saveSettingsMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>

              {saveSettingsMutation.isSuccess && (
                <p className="text-sm text-green-600">Settings saved successfully!</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
            <div className="space-y-2 text-sm">
              <p>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  className="text-primary hover:underline"
                  rel="noreferrer"
                >
                  📄 View Sitemap (sitemap.xml)
                </a>
              </p>
              <p>
                <a
                  href="/robots.txt"
                  target="_blank"
                  className="text-primary hover:underline"
                  rel="noreferrer"
                >
                  🤖 View Robots.txt
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
