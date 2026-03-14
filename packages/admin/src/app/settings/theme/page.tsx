'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw, Loader2, Palette, Type, Layout, MousePointer } from 'lucide-react';

interface ThemeSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string;
  label: string | null;
  description: string | null;
  sortOrder: number | null;
}

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Playfair Display',
  'Merriweather',
];

const GROUP_META: Record<string, { label: string; icon: React.ElementType }> = {
  colors: { label: 'Colors', icon: Palette },
  typography: { label: 'Typography', icon: Type },
  layout: { label: 'Layout', icon: Layout },
  buttons: { label: 'Buttons', icon: MousePointer },
};

export default function ThemeSettingsPage() {
  const [settings, setSettings] = useState<ThemeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiClient<{ data: ThemeSetting[] }>('/theme-settings');
      setSettings(res.data);
    } catch {
      setMessage({ text: 'Failed to load theme settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function updateValue(key: string, value: string) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function getVal(key: string): string {
    return settings.find((s) => s.key === key)?.value ?? '';
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = settings.map(({ key, value }) => ({ key, value }));
      const res = await apiClient<{ data: ThemeSetting[] }>('/theme-settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSettings(res.data);
      setMessage({ text: 'Theme saved successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ text: 'Failed to save theme settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset all theme settings to defaults? This cannot be undone.')) return;
    setResetting(true);
    setMessage(null);
    try {
      const res = await apiClient<{ data: ThemeSetting[] }>('/theme-settings/reset', {
        method: 'POST',
      });
      setSettings(res.data);
      setMessage({ text: 'Theme reset to defaults', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ text: 'Failed to reset theme', type: 'error' });
    } finally {
      setResetting(false);
    }
  }

  const grouped = settings.reduce<Record<string, ThemeSetting[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Theme Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Customize your storefront's colors, fonts, and layout
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span
              className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
            >
              {message.text}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Live Preview Strip */}
      <div className="mt-6 overflow-hidden rounded-lg border shadow-sm">
        <div
          className="p-6"
          style={{
            backgroundColor: getVal('background'),
            color: getVal('text'),
            fontFamily: getVal('bodyFont'),
            fontSize: `${getVal('baseFontSize')}px`,
            fontWeight: Number(getVal('bodyWeight')) || 400,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                style={{
                  fontFamily: getVal('headingFont'),
                  fontWeight: Number(getVal('headingWeight')) || 700,
                  fontSize: '1.5em',
                  color: getVal('text'),
                  margin: 0,
                }}
              >
                Live Preview
              </h3>
              <p style={{ color: getVal('muted'), margin: '4px 0 0 0' }}>
                This is how your storefront will look
              </p>
            </div>
            <div className="flex gap-2">
              <span
                style={{
                  backgroundColor: getVal('accent'),
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: `${getVal('buttonRadius')}px`,
                  fontSize: '0.85em',
                  fontWeight: 600,
                }}
              >
                Sale
              </span>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              style={{
                backgroundColor: getVal('primary'),
                color: '#fff',
                padding: `${getVal('buttonPaddingY')}px ${getVal('buttonPaddingX')}px`,
                borderRadius: `${getVal('buttonRadius')}px`,
                border: 'none',
                fontFamily: getVal('bodyFont'),
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Primary Button
            </button>
            <button
              style={{
                backgroundColor: getVal('secondary'),
                color: '#fff',
                padding: `${getVal('buttonPaddingY')}px ${getVal('buttonPaddingX')}px`,
                borderRadius: `${getVal('buttonRadius')}px`,
                border: 'none',
                fontFamily: getVal('bodyFont'),
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Secondary Button
            </button>
            <button
              style={{
                backgroundColor: 'transparent',
                color: getVal('primary'),
                padding: `${getVal('buttonPaddingY')}px ${getVal('buttonPaddingX')}px`,
                borderRadius: `${getVal('buttonRadius')}px`,
                border: `2px solid ${getVal('primary')}`,
                fontFamily: getVal('bodyFont'),
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Outline Button
            </button>
          </div>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="mt-8 space-y-8">
        {['colors', 'typography', 'layout', 'buttons'].map((groupKey) => {
          const items = grouped[groupKey];
          if (!items?.length) return null;
          const meta = GROUP_META[groupKey] ?? { label: groupKey, icon: Palette };
          const Icon = meta.icon;

          return (
            <div key={groupKey} className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">{meta.label}</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((setting) => (
                    <div key={setting.key}>
                      <Label htmlFor={setting.key}>{setting.label ?? setting.key}</Label>
                      {setting.description && (
                        <p className="mb-1.5 text-xs text-muted-foreground">
                          {setting.description}
                        </p>
                      )}
                      {setting.type === 'color' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id={`${setting.key}-picker`}
                            value={setting.value}
                            onChange={(e) => updateValue(setting.key, e.target.value)}
                            className="h-10 w-12 cursor-pointer rounded border p-1"
                          />
                          <Input
                            id={setting.key}
                            value={setting.value}
                            onChange={(e) => updateValue(setting.key, e.target.value)}
                            placeholder="#000000"
                            className="font-mono"
                          />
                        </div>
                      ) : setting.type === 'font' ? (
                        <select
                          id={setting.key}
                          value={setting.value}
                          onChange={(e) => updateValue(setting.key, e.target.value)}
                          className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          style={{ fontFamily: setting.value }}
                        >
                          {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font} style={{ fontFamily: font }}>
                              {font}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={setting.key}
                          type="number"
                          value={setting.value}
                          onChange={(e) => updateValue(setting.key, e.target.value)}
                          className="mt-1.5"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
