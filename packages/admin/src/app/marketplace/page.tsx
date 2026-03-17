'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  RefreshCw,
  Package,
  ClipboardList,
  Wifi,
  WifiOff,
  X,
  TestTube,
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface MarketplaceConnection {
  id: string;
  marketplaceId: string;
  name: string;
  settings: Record<string, unknown>;
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
}

interface MarketplaceListing {
  id: string;
  productId: string;
  marketplaceId: string;
  externalId: string;
  externalUrl: string | null;
  status: string;
  syncedAt: string | null;
}

interface SyncLog {
  id: string;
  marketplaceId: string;
  action: string;
  status: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface ConnectionForm {
  marketplaceId: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  sellerId: string;
}

const ALL_MARKETPLACES: Record<string, string> = {
  amazon: 'Amazon',
  ebay: 'eBay',
  otto: 'OTTO',
  kaufland: 'Kaufland',
};

const emptyForm: ConnectionForm = {
  marketplaceId: '',
  name: '',
  apiKey: '',
  apiSecret: '',
  sellerId: '',
};

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ConnectionForm>(emptyForm);

  // Fetch active marketplace plugins
  const { data: pluginsData } = useQuery({
    queryKey: ['plugins'],
    queryFn: () =>
      apiClient<{
        data: Array<{ name: string; type: string; isActive: boolean; description: string }>;
      }>('/plugins'),
  });

  const activeMarketplaces = (pluginsData?.data ?? [])
    .filter((p) => p.type === 'marketplace' && p.isActive)
    .map((p) => ({
      value: p.name.replace('marketplace-', ''),
      label: ALL_MARKETPLACES[p.name.replace('marketplace-', '')] ?? p.name,
    }));

  // Queries
  const { data: connectionsData, isLoading: loadingConnections } = useQuery({
    queryKey: ['marketplace-connections'],
    queryFn: () => apiClient<{ data: MarketplaceConnection[] }>('/marketplace/connections'),
  });

  const { data: listingsData } = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => apiClient<{ data: MarketplaceListing[] }>('/marketplace/listings'),
  });

  const { data: logsData } = useQuery({
    queryKey: ['marketplace-sync-logs'],
    queryFn: () => apiClient<{ data: SyncLog[] }>('/marketplace/sync-logs?limit=20'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/marketplace/connections', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/marketplace/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: { ok: boolean; message?: string } }>(
        `/marketplace/connections/${id}/test`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] });
    },
  });

  const syncProductsMutation = useMutation({
    mutationFn: (marketplaceId: string) =>
      apiClient('/marketplace/sync/products', {
        method: 'POST',
        body: JSON.stringify({ marketplaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-sync-logs'] });
    },
  });

  const importOrdersMutation = useMutation({
    mutationFn: (marketplaceId: string) =>
      apiClient('/marketplace/sync/orders', {
        method: 'POST',
        body: JSON.stringify({ marketplaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-sync-logs'] });
    },
  });

  const syncInventoryMutation = useMutation({
    mutationFn: (marketplaceId: string) =>
      apiClient('/marketplace/sync/inventory', {
        method: 'POST',
        body: JSON.stringify({ marketplaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-sync-logs'] });
    },
  });

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      marketplaceId: form.marketplaceId,
      name: form.name || ALL_MARKETPLACES[form.marketplaceId] || form.marketplaceId,
      settings: {
        apiKey: form.apiKey,
        apiSecret: form.apiSecret,
        sellerId: form.sellerId,
      },
    });
  }

  const connections = connectionsData?.data ?? [];
  const listings = listingsData?.data ?? [];
  const logs = logsData?.data ?? [];

  const listingCounts: Record<string, number> = {};
  for (const l of listings) {
    listingCounts[l.marketplaceId] = (listingCounts[l.marketplaceId] ?? 0) + 1;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="mt-1 text-muted-foreground">
            Connect and sync products with external marketplaces
          </p>
        </div>
        <button
          onClick={() => {
            setForm({
              ...emptyForm,
              marketplaceId: activeMarketplaces[0]?.value ?? '',
            });
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Connect Marketplace
        </button>
      </div>

      {/* Connection Cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingConnections && (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            Loading connections...
          </div>
        )}

        {!loadingConnections && connections.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-sm">
            No marketplaces connected yet. Click &quot;Connect Marketplace&quot; to get started.
          </div>
        )}

        {connections.map((conn) => {
          return (
            <div key={conn.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ALL_MARKETPLACES[conn.marketplaceId] ?? conn.marketplaceId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {conn.status === 'connected' ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-gray-400" />
                  )}
                  {statusBadge(conn.status)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{listingCounts[conn.marketplaceId] ?? 0} listings</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  <span>
                    Last sync:{' '}
                    {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <TestTube className="h-3 w-3" />
                  Test
                </button>
                <button
                  onClick={() => syncProductsMutation.mutate(conn.marketplaceId)}
                  disabled={syncProductsMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <ArrowUpFromLine className="h-3 w-3" />
                  Sync Products
                </button>
                <button
                  onClick={() => importOrdersMutation.mutate(conn.marketplaceId)}
                  disabled={importOrdersMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  Import Orders
                </button>
                <button
                  onClick={() => syncInventoryMutation.mutate(conn.marketplaceId)}
                  disabled={syncInventoryMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync Inventory
                </button>
                <button
                  onClick={() => {
                    if (confirm('Remove this marketplace connection?')) {
                      deleteMutation.mutate(conn.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Listings Table */}
      {listings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Listings</h2>
          <div className="mt-4 rounded-lg border bg-card shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Marketplace</th>
                  <th className="p-4 font-medium">External ID</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last Synced</th>
                  <th className="p-4 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 20).map((listing) => (
                  <tr key={listing.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 font-medium">{listing.marketplaceId}</td>
                    <td className="p-4 font-mono text-sm">{listing.externalId}</td>
                    <td className="p-4">{statusBadge(listing.status)}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {listing.syncedAt ? new Date(listing.syncedAt).toLocaleString() : '—'}
                    </td>
                    <td className="p-4">
                      {listing.externalUrl ? (
                        <a
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sync Log Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Sync History</h2>
        <div className="mt-4 rounded-lg border bg-card shadow-sm">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No sync history yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium">Marketplace</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-medium">{log.marketplaceId}</td>
                    <td className="p-4 text-sm">{log.action.replace(/_/g, ' ')}</td>
                    <td className="p-4">{statusBadge(log.status)}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Connect Marketplace</h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Marketplace</label>
                <select
                  value={form.marketplaceId}
                  onChange={(e) => setForm((f) => ({ ...f, marketplaceId: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                >
                  {activeMarketplaces.length === 0 && (
                    <option value="" disabled>
                      No marketplace plugins active
                    </option>
                  )}
                  {activeMarketplaces.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Display Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="e.g. My Amazon Store"
                />
              </div>

              <div>
                <label className="text-sm font-medium">API Key</label>
                <input
                  required
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="Enter API key"
                />
              </div>

              <div>
                <label className="text-sm font-medium">API Secret</label>
                <input
                  type="password"
                  value={form.apiSecret}
                  onChange={(e) => setForm((f) => ({ ...f, apiSecret: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="Enter API secret (if applicable)"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Seller ID</label>
                <input
                  value={form.sellerId}
                  onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="Enter seller/merchant ID (if applicable)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
