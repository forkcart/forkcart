'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import {
  Cookie,
  Save,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  Shield,
  BarChart3,
  Megaphone,
  Cog,
} from 'lucide-react';

interface ConsentCategory {
  id: string;
  key: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
  sortOrder: number;
}

interface ConsentSetting {
  id: string;
  key: string;
  value: string;
}

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  necessary: Shield,
  functional: Cog,
  analytics: BarChart3,
  marketing: Megaphone,
};

export default function CookieConsentSettingsPage() {
  const [categories, setCategories] = useState<ConsentCategory[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCategory, setNewCategory] = useState({ key: '', label: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, settingsRes] = await Promise.all([
        apiClient<{ data: ConsentCategory[] }>('/cookie-consent/categories'),
        apiClient<{ data: ConsentSetting[] }>('/cookie-consent/settings'),
      ]);
      setCategories(catRes.data);
      const map: Record<string, string> = {};
      for (const s of settingsRes.data) {
        map[s.key] = s.value;
      }
      setSettings(map);
    } catch (err) {
      console.error('Failed to load cookie consent config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await apiClient('/cookie-consent/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCategory(cat: ConsentCategory) {
    try {
      await apiClient(`/cookie-consent/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: cat.label,
          description: cat.description,
          enabled: cat.enabled,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  }

  async function handleAddCategory() {
    if (!newCategory.key || !newCategory.label || !newCategory.description) return;
    try {
      await apiClient('/cookie-consent/categories', {
        method: 'POST',
        body: JSON.stringify({
          ...newCategory,
          sortOrder: categories.length,
        }),
      });
      setNewCategory({ key: '', label: '', description: '' });
      setShowAddForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await apiClient(`/cookie-consent/categories/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateCategory(id: string, updates: Partial<ConsentCategory>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

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
          <h1 className="text-3xl font-bold">Cookie Consent</h1>
          <p className="mt-1 text-muted-foreground">
            DSGVO-konforme Cookie-Einstellungen für die Storefront
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Gespeichert!' : 'Texte speichern'}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {/* Banner Texts */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Cookie className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Banner-Texte</h2>
              <p className="text-sm text-muted-foreground">
                Texte die im Cookie-Banner angezeigt werden
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="banner_title">Banner-Überschrift</Label>
              <Input
                id="banner_title"
                value={settings['banner_title'] ?? ''}
                onChange={(e) => updateSetting('banner_title', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="banner_text">Banner-Text</Label>
              <Textarea
                id="banner_text"
                value={settings['banner_text'] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateSetting('banner_text', e.target.value)
                }
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="banner_accept_all">Button: Alle akzeptieren</Label>
              <Input
                id="banner_accept_all"
                value={settings['banner_accept_all'] ?? ''}
                onChange={(e) => updateSetting('banner_accept_all', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="banner_reject_all">Button: Nur notwendige</Label>
              <Input
                id="banner_reject_all"
                value={settings['banner_reject_all'] ?? ''}
                onChange={(e) => updateSetting('banner_reject_all', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="banner_settings">Button: Einstellungen</Label>
              <Input
                id="banner_settings"
                value={settings['banner_settings'] ?? ''}
                onChange={(e) => updateSetting('banner_settings', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="modal_title">Modal-Überschrift</Label>
              <Input
                id="modal_title"
                value={settings['modal_title'] ?? ''}
                onChange={(e) => updateSetting('modal_title', e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="modal_save">Modal: Auswahl speichern</Label>
              <Input
                id="modal_save"
                value={settings['modal_save'] ?? ''}
                onChange={(e) => updateSetting('modal_save', e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Cookie Categories */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Cookie-Kategorien</h2>
                <p className="text-sm text-muted-foreground">
                  Kategorien die der Kunde im Cookie-Modal sieht
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Kategorie hinzufügen
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="new_key">Key (a-z, _)</Label>
                  <Input
                    id="new_key"
                    value={newCategory.key}
                    onChange={(e) =>
                      setNewCategory((p) => ({
                        ...p,
                        key: e.target.value.toLowerCase().replace(/[^a-z_]/g, ''),
                      }))
                    }
                    placeholder="z.B. social_media"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new_label">Label</Label>
                  <Input
                    id="new_label"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory((p) => ({ ...p, label: e.target.value }))}
                    placeholder="z.B. Social Media"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new_desc">Beschreibung</Label>
                  <Input
                    id="new_desc"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Was macht diese Kategorie?"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-muted"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddCategory}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          )}

          {/* Category list */}
          <div className="mt-4 space-y-3">
            {categories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.key] ?? Cookie;
              return (
                <div key={cat.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{cat.key}</span>
                        {cat.required && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            PFLICHT
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={cat.label}
                            onChange={(e) => updateCategory(cat.id, { label: e.target.value })}
                            onBlur={() => handleUpdateCategory(cat)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Beschreibung</Label>
                          <Input
                            value={cat.description}
                            onChange={(e) =>
                              updateCategory(cat.id, { description: e.target.value })
                            }
                            onBlur={() => handleUpdateCategory(cat)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={cat.enabled}
                            onChange={(e) => {
                              const updated = { ...cat, enabled: e.target.checked };
                              updateCategory(cat.id, { enabled: e.target.checked });
                              handleUpdateCategory(updated);
                            }}
                            className="rounded border-gray-300"
                          />
                          Aktiv
                        </label>
                        {!cat.required && (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="inline-flex items-center gap-1 text-sm text-red-500 transition hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Löschen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
