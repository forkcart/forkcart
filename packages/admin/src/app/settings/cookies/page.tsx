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
  Globe,
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
  locale?: string;
}

interface LanguageInfo {
  locale: string;
  name: string;
  isDefault: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  necessary: Shield,
  functional: Cog,
  analytics: BarChart3,
  marketing: Megaphone,
};

const LABELS: Record<string, Record<string, string>> = {
  de: {
    bannerTexts: 'Banner-Texte',
    bannerTextsDesc: 'Texte die im Cookie-Banner angezeigt werden',
    bannerTitle: 'Banner-Überschrift',
    bannerText: 'Banner-Text',
    acceptAll: 'Button: Alle akzeptieren',
    rejectAll: 'Button: Nur notwendige',
    settings: 'Button: Einstellungen',
    modalTitle: 'Modal-Überschrift',
    modalSave: 'Modal: Auswahl speichern',
    emptyHint:
      'Wenn Felder leer bleiben, werden die Standard-Übersetzungen aus den Sprachdateien verwendet.',
    categories: 'Cookie-Kategorien',
    categoriesDesc: 'Kategorien die der Kunde im Cookie-Modal sieht',
    addCategory: 'Kategorie hinzufügen',
    label: 'Label',
    description: 'Beschreibung',
    active: 'Aktiv',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    add: 'Hinzufügen',
    required: 'PFLICHT',
    save: 'Texte speichern',
    saved: 'Gespeichert!',
    deleteConfirm: 'Kategorie wirklich löschen?',
  },
  en: {
    bannerTexts: 'Banner Texts',
    bannerTextsDesc: 'Texts shown in the cookie consent banner',
    bannerTitle: 'Banner Title',
    bannerText: 'Banner Text',
    acceptAll: 'Button: Accept All',
    rejectAll: 'Button: Only Necessary',
    settings: 'Button: Settings',
    modalTitle: 'Modal Title',
    modalSave: 'Modal: Save Selection',
    emptyHint: 'Empty fields will use the default translations from the language files.',
    categories: 'Cookie Categories',
    categoriesDesc: 'Categories the customer sees in the cookie modal',
    addCategory: 'Add Category',
    label: 'Label',
    description: 'Description',
    active: 'Active',
    delete: 'Delete',
    cancel: 'Cancel',
    add: 'Add',
    required: 'REQUIRED',
    save: 'Save texts',
    saved: 'Saved!',
    deleteConfirm: 'Really delete this category?',
  },
};

export default function CookieConsentSettingsPage() {
  const [categories, setCategories] = useState<ConsentCategory[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [locales, setLocales] = useState<LanguageInfo[]>([]);
  const [activeLocale, setActiveLocale] = useState<string>('de');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCategory, setNewCategory] = useState({ key: '', label: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const loadLocales = useCallback(async () => {
    try {
      const res = await apiClient<{ data: LanguageInfo[] }>('/translations');
      setLocales(res.data);
      const defaultLocale = res.data.find((l) => l.isDefault);
      if (defaultLocale) setActiveLocale(defaultLocale.locale);
    } catch {
      // Fallback
      setLocales([
        { locale: 'de', name: 'Deutsch', isDefault: true },
        { locale: 'en', name: 'English', isDefault: false },
      ]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, settingsRes] = await Promise.all([
        apiClient<{ data: ConsentCategory[] }>('/cookie-consent/categories'),
        apiClient<{ data: ConsentSetting[] }>(`/cookie-consent/settings?locale=${activeLocale}`),
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
  }, [activeLocale]);

  useEffect(() => {
    loadLocales();
  }, [loadLocales]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await apiClient(`/cookie-consent/settings?locale=${activeLocale}`, {
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
    if (!confirm(l('deleteConfirm'))) return;
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

  const l = (key: string) => LABELS['en']?.[key] ?? key;

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
          {saved ? l('saved') : l('save')}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {/* Banner Texts */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cookie className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">{l('bannerTexts')}</h2>
                <p className="text-sm text-muted-foreground">{l('bannerTextsDesc')}</p>
              </div>
            </div>
          </div>

          {/* Locale Tabs */}
          {locales.length > 1 && (
            <div className="mt-4 flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
              <Globe className="ml-2 h-4 w-4 text-muted-foreground" />
              {locales.map((lang) => (
                <button
                  key={lang.locale}
                  onClick={() => setActiveLocale(lang.locale)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    activeLocale === lang.locale
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang.locale.toUpperCase()}
                  {lang.isDefault && (
                    <span className="ml-1 text-[10px] text-muted-foreground">(Standard)</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">{l('emptyHint')}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="banner_title">{l('bannerTitle')}</Label>
              <Input
                id="banner_title"
                value={settings['banner_title'] ?? ''}
                onChange={(e) => updateSetting('banner_title', e.target.value)}
                placeholder={
                  activeLocale === 'de'
                    ? 'Wir respektieren Ihre Privatsphäre'
                    : 'We respect your privacy'
                }
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="banner_text">{l('bannerText')}</Label>
              <Textarea
                id="banner_text"
                value={settings['banner_text'] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateSetting('banner_text', e.target.value)
                }
                placeholder={
                  activeLocale === 'de'
                    ? 'Wir verwenden Cookies...'
                    : 'We use cookies to provide you with the best shopping experience.'
                }
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="banner_accept_all">{l('acceptAll')}</Label>
              <Input
                id="banner_accept_all"
                value={settings['banner_accept_all'] ?? ''}
                onChange={(e) => updateSetting('banner_accept_all', e.target.value)}
                placeholder={activeLocale === 'de' ? 'Alle akzeptieren' : 'Accept all'}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="banner_reject_all">{l('rejectAll')}</Label>
              <Input
                id="banner_reject_all"
                value={settings['banner_reject_all'] ?? ''}
                onChange={(e) => updateSetting('banner_reject_all', e.target.value)}
                placeholder={activeLocale === 'de' ? 'Nur notwendige' : 'Only necessary'}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="banner_settings">{l('settings')}</Label>
              <Input
                id="banner_settings"
                value={settings['banner_settings'] ?? ''}
                onChange={(e) => updateSetting('banner_settings', e.target.value)}
                placeholder={activeLocale === 'de' ? 'Einstellungen' : 'Settings'}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="modal_title">{l('modalTitle')}</Label>
              <Input
                id="modal_title"
                value={settings['modal_title'] ?? ''}
                onChange={(e) => updateSetting('modal_title', e.target.value)}
                placeholder={activeLocale === 'de' ? 'Cookie-Einstellungen' : 'Cookie Settings'}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="modal_save">{l('modalSave')}</Label>
              <Input
                id="modal_save"
                value={settings['modal_save'] ?? ''}
                onChange={(e) => updateSetting('modal_save', e.target.value)}
                placeholder={activeLocale === 'de' ? 'Auswahl speichern' : 'Save selection'}
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
                <h2 className="text-lg font-semibold">{l('categories')}</h2>
                <p className="text-sm text-muted-foreground">{l('categoriesDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              {l('addCategory')}
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
                  <Label htmlFor="new_desc">{l('description')}</Label>
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
                            {l('required')}
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
                          <Label>{l('description')}</Label>
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
