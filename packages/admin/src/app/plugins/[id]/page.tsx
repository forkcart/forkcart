'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Globe,
  Mail,
  Truck,
  BarChart,
  Puzzle,
  Save,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
  placeholder?: string;
  min?: number;
  max?: number;
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

// ─── Type config ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { badge: string; icon: LucideIcon }> = {
  payment: { badge: 'Payment', icon: CreditCard },
  marketplace: { badge: 'Marketplace', icon: Globe },
  email: { badge: 'Email', icon: Mail },
  shipping: { badge: 'Shipping', icon: Truck },
  analytics: { badge: 'Analytics', icon: BarChart },
  general: { badge: 'General', icon: Puzzle },
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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PluginDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pluginId = params.id as string;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Query ──────────────────────────────────────────────────────────────

  const {
    data: pluginsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiClient<{ data: Plugin[] }>('/plugins'),
  });

  const plugin = pluginsData?.data?.find((p) => p.id === pluginId);

  // Initialize form values from current settings
  useEffect(() => {
    if (!plugin) return;

    const initial: Record<string, string> = {};

    // For each schema field, get the current value or default
    for (const schema of plugin.settingsSchema) {
      const currentSetting = plugin.settings.find((s) => s.key === schema.key);
      const value = currentSetting?.value;

      if (value === '••••••••') {
        // Secret — leave empty for re-entry
        initial[schema.key] = '';
      } else if (value !== null && value !== undefined) {
        initial[schema.key] = String(value);
      } else if (schema.default !== undefined) {
        initial[schema.key] = String(schema.default);
      } else {
        initial[schema.key] = '';
      }
    }

    setFormValues(initial);
  }, [plugin]);

  // ─── Mutations ──────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      apiClient(`/plugins/${pluginId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      showToast('success', plugin?.isActive ? 'Plugin deactivated' : 'Plugin activated');
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Failed to toggle plugin');
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      apiClient(`/plugins/${pluginId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      showToast('success', 'Settings saved');
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings');
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: () => apiClient(`/plugins/${pluginId}/uninstall`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      router.push('/plugins');
    },
    onError: (err) => {
      showToast('error', err instanceof Error ? err.message : 'Uninstall failed');
    },
  });

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  function handleSave() {
    // Only send non-empty values (don't overwrite secrets with empty strings)
    const toSave: Record<string, unknown> = {};
    for (const schema of plugin?.settingsSchema ?? []) {
      const val = formValues[schema.key];
      if (val === undefined || val === '') continue;

      if (schema.type === 'number') {
        toSave[schema.key] = Number(val);
      } else if (schema.type === 'boolean') {
        toSave[schema.key] = val === 'true';
      } else {
        toSave[schema.key] = val;
      }
    }

    if (Object.keys(toSave).length === 0) {
      showToast('error', 'No settings to save');
      return;
    }

    saveSettingsMutation.mutate(toSave);
  }

  // ─── Loading / Error states ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading plugin...
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div className="py-12 text-center">
        <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">Plugin not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">This plugin may have been uninstalled.</p>
        <button
          onClick={() => router.push('/plugins')}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </button>
      </div>
    );
  }

  const config = TYPE_CONFIG[plugin.type] ?? TYPE_CONFIG['general']!;
  const TypeIcon = config.icon;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'mb-4 flex items-center gap-2 rounded-md p-3 text-sm',
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

      {/* Back link */}
      <button
        onClick={() => router.push('/plugins')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Plugins
      </button>

      {/* Header */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                plugin.isActive ? 'bg-green-100' : 'bg-muted',
              )}
            >
              <TypeIcon
                className={cn(
                  'h-7 w-7',
                  plugin.isActive ? 'text-green-600' : 'text-muted-foreground',
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{plugin.name}</h1>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  v{plugin.version}
                </span>
                <Badge variant={getTypeBadgeVariant(plugin.type)}>
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {config.badge}
                </Badge>
              </div>
              {plugin.description && (
                <p className="mt-1 text-muted-foreground">{plugin.description}</p>
              )}
              {plugin.author && (
                <p className="mt-0.5 text-sm text-muted-foreground/60">by {plugin.author}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Active/Inactive toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {plugin.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => toggleMutation.mutate(!plugin.isActive)}
                disabled={toggleMutation.isPending}
                className={cn(
                  'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                  plugin.isActive ? 'bg-green-500' : 'bg-gray-300',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                    plugin.isActive ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            <button
              onClick={() => setConfirmUninstall(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Uninstall
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      {plugin.settingsSchema.length > 0 && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure this plugin to work with your store.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {plugin.settingsSchema.map((schema) => {
              const fieldKey = schema.key;
              const value = formValues[fieldKey] ?? '';
              const isSecret = schema.secret === true;
              const showKey = `show_${fieldKey}`;
              const existingSetting = plugin.settings.find((s) => s.key === fieldKey);
              const hasMaskedValue = existingSetting?.value === '••••••••';

              return (
                <div
                  key={fieldKey}
                  className={cn(
                    schema.type === 'boolean' ? '' : 'sm:col-span-2',
                    schema.type === 'select' ? 'sm:col-span-1' : '',
                  )}
                >
                  <Label htmlFor={fieldKey}>
                    {schema.label ?? fieldKey}
                    {schema.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>

                  {/* String field */}
                  {schema.type === 'string' && (
                    <div className="relative mt-1.5">
                      <Input
                        id={fieldKey}
                        type={isSecret && !showSecrets[showKey] ? 'password' : 'text'}
                        placeholder={
                          hasMaskedValue
                            ? '(configured — enter new value to change)'
                            : (schema.placeholder ?? (schema.default ? String(schema.default) : ''))
                        }
                        value={value}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                        }
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets((prev) => ({
                              ...prev,
                              [showKey]: !prev[showKey],
                            }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[showKey] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Number field */}
                  {schema.type === 'number' && (
                    <Input
                      id={fieldKey}
                      type="number"
                      min={schema.min}
                      max={schema.max}
                      placeholder={schema.default !== undefined ? String(schema.default) : ''}
                      value={value}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                      }
                      className="mt-1.5"
                    />
                  )}

                  {/* Boolean field */}
                  {schema.type === 'boolean' && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormValues((prev) => ({
                            ...prev,
                            [fieldKey]: prev[fieldKey] === 'true' ? 'false' : 'true',
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          value === 'true' ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                            value === 'true' ? 'translate-x-6' : 'translate-x-1',
                          )}
                        />
                      </button>
                      <span className="text-sm text-muted-foreground">
                        {value === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}

                  {/* Select field */}
                  {schema.type === 'select' && (
                    <Select
                      id={fieldKey}
                      value={value}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                      }
                      className="mt-1.5"
                    >
                      <option value="">Select...</option>
                      {(schema.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  )}

                  {schema.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{schema.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 border-t pt-4">
            <button
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Admin Pages */}
      {plugin.isActive && plugin.adminPages && plugin.adminPages.length > 0 && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Admin Pages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Custom pages provided by this plugin.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(plugin.adminPages as Array<{ path: string; label: string; icon?: string }>).map(
              (page) => (
                <button
                  key={page.path}
                  onClick={() =>
                    router.push(`/plugins/${pluginId}/${page.path.replace(/^\//, '')}`)
                  }
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <Puzzle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{page.label}</span>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* Plugin info */}
      <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Information</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="mt-0.5 font-medium capitalize">{plugin.source}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Installed</dt>
            <dd className="mt-0.5 font-medium">
              {new Date(plugin.installedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="mt-0.5 font-medium">{plugin.version}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="mt-0.5 font-medium capitalize">{plugin.type}</dd>
          </div>
        </dl>
      </div>

      {/* Uninstall confirmation modal */}
      {confirmUninstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Uninstall {plugin.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to uninstall this plugin? This will remove all associated
              settings and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmUninstall(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => uninstallMutation.mutate()}
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
