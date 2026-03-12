'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Puzzle, Save, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

interface PluginSetting {
  key: string;
  value: unknown;
}

interface RequiredSetting {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
}

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  type: string;
  isActive: boolean;
  settings: PluginSetting[];
  requiredSettings: RequiredSetting[];
  installedAt: string;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await apiClient<{ data: Plugin[] }>('/plugins');
      setPlugins(res.data);

      // Initialize edit state with current values
      const initial: Record<string, Record<string, string>> = {};
      for (const plugin of res.data) {
        initial[plugin.id] = {};
        for (const s of plugin.settings) {
          // Masked secrets show as empty to allow re-entry
          initial[plugin.id]![s.key] = s.value === '••••••••' ? '' : String(s.value ?? '');
        }
      }
      setEditSettings(initial);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load plugins',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  async function handleToggle(pluginId: string, isActive: boolean) {
    try {
      await apiClient(`/plugins/${pluginId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      });
      setPlugins((prev) => prev.map((p) => (p.id === pluginId ? { ...p, isActive } : p)));
      setMessage({ type: 'success', text: `Plugin ${isActive ? 'activated' : 'deactivated'}` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to toggle plugin',
      });
    }
  }

  async function handleSaveSettings(pluginId: string) {
    const settings = editSettings[pluginId];
    if (!settings) return;

    // Only send non-empty values (don't overwrite secrets with empty strings)
    const toSave: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (value !== '') {
        toSave[key] = value;
      }
    }

    if (Object.keys(toSave).length === 0) {
      setMessage({ type: 'error', text: 'No settings to save' });
      return;
    }

    setSaving(pluginId);
    try {
      await apiClient(`/plugins/${pluginId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(toSave),
      });
      setMessage({ type: 'success', text: 'Settings saved' });
      await fetchPlugins(); // Refresh to get masked values
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading plugins...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plugins</h1>
          <p className="mt-1 text-muted-foreground">
            Manage payment providers, shipping, and extensions
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-md p-4 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-xs underline">
            dismiss
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {plugins.map((plugin) => (
          <div key={plugin.id} className="rounded-lg border bg-card shadow-sm">
            {/* Plugin header */}
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <Puzzle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{plugin.name}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      v{plugin.version}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        plugin.type === 'payment'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {plugin.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plugin.description}</p>
                  {plugin.author && (
                    <p className="text-xs text-muted-foreground">by {plugin.author}</p>
                  )}
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(plugin.id, !plugin.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  plugin.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    plugin.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Plugin settings */}
            {plugin.requiredSettings.length > 0 && (
              <div className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Configuration</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {plugin.requiredSettings.map((setting) => {
                    const currentValue = editSettings[plugin.id]?.[setting.key] ?? '';
                    const isSecret = setting.type === 'password';
                    const showKey = `${plugin.id}_${setting.key}`;
                    const existingSetting = plugin.settings.find((s) => s.key === setting.key);

                    return (
                      <div key={setting.key} className="sm:col-span-2">
                        <Label htmlFor={showKey}>
                          {setting.label}
                          {setting.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <div className="relative mt-1.5">
                          <Input
                            id={showKey}
                            type={isSecret && !showSecrets[showKey] ? 'password' : 'text'}
                            placeholder={
                              existingSetting?.value === '••••••••'
                                ? '(configured — enter new value to change)'
                                : setting.placeholder
                            }
                            value={currentValue}
                            onChange={(e) =>
                              setEditSettings((prev) => ({
                                ...prev,
                                [plugin.id]: {
                                  ...prev[plugin.id],
                                  [setting.key]: e.target.value,
                                },
                              }))
                            }
                          />
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowSecrets((prev) => ({ ...prev, [showKey]: !prev[showKey] }))
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showSecrets[showKey] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                        {setting.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleSaveSettings(plugin.id)}
                  disabled={saving === plugin.id}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving === plugin.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Settings
                </button>
              </div>
            )}
          </div>
        ))}

        {plugins.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No plugins installed</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plugins will appear here once registered in the system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
