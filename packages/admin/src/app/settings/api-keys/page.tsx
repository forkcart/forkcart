'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Clock,
  Shield,
} from 'lucide-react';

interface ApiKeyData {
  id: string;
  prefix: string;
  displayKey: string;
  name: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreatedKeyData extends ApiKeyData {
  key: string;
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<CreatedKeyData | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient<{ data: ApiKeyData[] }>('/api-keys'),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient<{ data: CreatedKeyData }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (result) => {
      setNewKeyResult(result.data);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCreate() {
    if (!newKeyName.trim()) return;
    createMutation.mutate(newKeyName.trim());
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const keys = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="mt-1 text-muted-foreground">
            Manage API keys for programmatic access to your store
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setNewKeyResult(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Create Key Dialog */}
      {showCreate && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          {newKeyResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    Copy your API key now — it won't be shown again!
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Store it securely. If you lose it, you'll need to create a new one.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-sm">
                  {newKeyResult.key}
                </code>
                <button
                  onClick={() => handleCopy(newKeyResult.key)}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-3 text-sm transition hover:bg-muted"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Name:</strong> {newKeyResult.name}
                </p>
                <p>
                  <strong>Usage:</strong> Set as{' '}
                  <code className="rounded bg-muted px-1">X-Api-Key</code> header or{' '}
                  <code className="rounded bg-muted px-1">
                    Authorization: Bearer {newKeyResult.displayKey}
                  </code>
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewKeyResult(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Create New API Key</h2>
              </div>

              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Agent, Inventory Sync"
                  className="mt-1.5"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Key
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted"
                >
                  Cancel
                </button>
              </div>

              {createMutation.isError && (
                <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium">No API Keys</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an API key to enable programmatic access to your store.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Key className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {key.displayKey}
                      </code>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {key.lastUsedAt ? `Used ${formatDate(key.lastUsedAt)}` : 'Never used'}
                      </span>
                      {key.permissions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {key.permissions.length} permissions
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      Created {formatDate(key.createdAt)}
                      {key.expiresAt && ` · Expires ${formatDate(key.expiresAt)}`}
                    </p>
                  </div>
                </div>

                <div>
                  {deletingId === key.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">Delete?</span>
                      <button
                        onClick={() => deleteMutation.mutate(key.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Yes'
                        )}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-muted"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(key.id)}
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
