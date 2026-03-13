'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  Globe,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Save,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────

interface LanguageInfo {
  locale: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  completionPct: number;
  totalKeys: number;
  translatedKeys: number;
}

interface TranslationKey {
  key: string;
  value: string;
  source: 'file' | 'db' | 'missing';
  enValue: string;
}

const FLAG_MAP: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  nl: '🇳🇱',
  pt: '🇵🇹',
  pl: '🇵🇱',
  cs: '🇨🇿',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  ar: '🇸🇦',
  ru: '🇷🇺',
  tr: '🇹🇷',
  sv: '🇸🇪',
  da: '🇩🇰',
  fi: '🇫🇮',
  no: '🇳🇴',
  hu: '🇭🇺',
  ro: '🇷🇴',
  uk: '🇺🇦',
  el: '🇬🇷',
  th: '🇹🇭',
  vi: '🇻🇳',
  hi: '🇮🇳',
};

// ── Main Page ────────────────────────────────────────────────────────

export default function TranslationsPage() {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await apiClient<{ data: LanguageInfo[] }>('/translations');
      setLanguages(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load languages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  if (selectedLocale) {
    return (
      <TranslationEditor
        locale={selectedLocale}
        languages={languages}
        onBack={() => {
          setSelectedLocale(null);
          fetchLanguages();
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Translation Manager</h1>
            <p className="mt-1 text-muted-foreground">Manage languages and translate your store</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Language
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Language Cards */}
      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : languages.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <Globe className="mx-auto h-12 w-12 opacity-30" />
          <p className="mt-4 text-lg font-medium">No languages configured</p>
          <p className="mt-1 text-sm">Click &quot;Add Language&quot; to get started</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((lang) => (
            <LanguageCard
              key={lang.locale}
              lang={lang}
              onClick={() => setSelectedLocale(lang.locale)}
              onDelete={
                lang.locale !== 'en'
                  ? async () => {
                      if (!confirm(`Delete ${lang.name} (${lang.locale})?`)) return;
                      await apiClient(`/translations/${lang.locale}`, { method: 'DELETE' });
                      fetchLanguages();
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Add Language Dialog */}
      {showAddDialog && (
        <AddLanguageDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={() => {
            setShowAddDialog(false);
            fetchLanguages();
          }}
        />
      )}
    </div>
  );
}

// ── Language Card ─────────────────────────────────────────────────────

function LanguageCard({
  lang,
  onClick,
  onDelete,
}: {
  lang: LanguageInfo;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const pct = Math.round(lang.completionPct);
  const flag = FLAG_MAP[lang.locale] ?? '🌐';
  const isComplete = pct >= 100;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          title="Delete language"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <span className="text-2xl">{flag}</span>
        <div>
          <p className="font-semibold">{lang.nativeName || lang.name}</p>
          <p className="text-xs text-muted-foreground">{lang.locale}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {lang.translatedKeys}/{lang.totalKeys} keys
          </span>
          <span className={isComplete ? 'font-medium text-green-600' : 'text-muted-foreground'}>
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              isComplete ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {!isComplete && (
        <p className="mt-2 text-xs text-amber-600">
          {lang.totalKeys - lang.translatedKeys} missing
        </p>
      )}
    </div>
  );
}

// ── Add Language Dialog ──────────────────────────────────────────────

function AddLanguageDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [locale, setLocale] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locale.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient('/translations', {
        method: 'POST',
        body: JSON.stringify({
          locale: locale.trim().toLowerCase(),
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create language');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Language</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="locale">Locale Code</Label>
            <Input
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="e.g. fr, es, it, nl"
              className="mt-1.5"
              maxLength={10}
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">
              ISO 639-1 language code (2 letters)
            </p>
          </div>

          <div>
            <Label htmlFor="langName">Language Name (optional)</Label>
            <Input
              id="langName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-detected from locale code"
              className="mt-1.5"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!locale.trim() || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Language
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Translation Editor ───────────────────────────────────────────────

function TranslationEditor({
  locale,
  languages,
  onBack,
}: {
  locale: string;
  languages: LanguageInfo[];
  onBack: () => void;
}) {
  const [keys, setKeys] = useState<TranslationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nsFilter, setNsFilter] = useState('');
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [aiTranslating, setAiTranslating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const lang = languages.find((l) => l.locale === locale);
  const flag = FLAG_MAP[locale] ?? '🌐';

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient<{ data: { locale: string; keys: TranslationKey[] } }>(
          `/translations/${locale}`,
        );
        setKeys(res.data.keys);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  // Extract namespaces
  const namespaces = useMemo(() => {
    const ns = new Set<string>();
    for (const k of keys) {
      const parts = k.key.split('.');
      if (parts.length > 1) ns.add(parts[0]!);
    }
    return Array.from(ns).sort();
  }, [keys]);

  // Filtered keys
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      if (nsFilter && !k.key.startsWith(nsFilter + '.')) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          k.key.toLowerCase().includes(q) ||
          k.enValue.toLowerCase().includes(q) ||
          k.value.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [keys, nsFilter, searchQuery]);

  // Stats
  const missingCount = keys.filter((k) => k.source === 'missing' && !changes[k.key]).length;
  const changesCount = Object.keys(changes).length;

  function handleValueChange(key: string, value: string) {
    setChanges((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (changesCount === 0) return;
    setSaving(true);
    try {
      await apiClient(`/translations/${locale}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      // Update local state
      setKeys((prev) =>
        prev.map((k) =>
          changes[k.key] !== undefined
            ? { ...k, value: changes[k.key]!, source: 'db' as const }
            : k,
        ),
      );
      setChanges({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      const res = await apiClient<Record<string, unknown>>(`/translations/export/${locale}`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${locale}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle error
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await apiClient(`/translations/import/${locale}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        // Reload
        const res = await apiClient<{ data: { locale: string; keys: TranslationKey[] } }>(
          `/translations/${locale}`,
        );
        setKeys(res.data.keys);
        setChanges({});
      } catch {
        // handle error
      }
    };
    input.click();
  }

  async function handleAITranslate() {
    if (locale === 'en') return;
    setAiTranslating(true);
    setAiResult(null);
    try {
      const res = await apiClient<{ data: { translated: Record<string, string>; count: number } }>(
        `/translations/${locale}/auto-translate`,
        { method: 'POST' },
      );
      if (res.data.count === 0) {
        setAiResult('All keys are already translated! ✓');
      } else {
        setAiResult(`Translated ${res.data.count} keys with AI ✓`);
        // Reload keys
        const reloaded = await apiClient<{ data: { locale: string; keys: TranslationKey[] } }>(
          `/translations/${locale}`,
        );
        setKeys(reloaded.data.keys);
        setChanges({});
      }
      setTimeout(() => setAiResult(null), 5000);
    } catch (err) {
      setAiResult(err instanceof Error ? `Error: ${err.message}` : 'AI translation failed');
      setTimeout(() => setAiResult(null), 5000);
    } finally {
      setAiTranslating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-2xl">{flag}</span>
          <div>
            <h1 className="text-2xl font-bold">{lang?.nativeName || locale}</h1>
            <p className="text-sm text-muted-foreground">
              {lang?.translatedKeys ?? 0}/{lang?.totalKeys ?? 0} keys translated
              {missingCount > 0 && (
                <span className="ml-2 text-amber-600">({missingCount} missing)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          {locale !== 'en' && missingCount > 0 && (
            <button
              onClick={handleAITranslate}
              disabled={aiTranslating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
            >
              {aiTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🤖</span>}
              {aiTranslating ? 'Translating...' : `AI Translate (${missingCount})`}
            </button>
          )}
          {aiResult && (
            <span
              className={`text-sm ${aiResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}
            >
              {aiResult}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={changesCount === 0 || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : `Save (${changesCount})`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search translation keys..."
            className="pl-9"
          />
        </div>
        <select
          value={nsFilter}
          onChange={(e) => setNsFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      </div>

      {/* Translation Table */}
      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  English
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  {lang?.nativeName || locale}
                </th>
                <th className="w-20 px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((k) => {
                const currentValue = changes[k.key] ?? k.value;
                const isMissing = k.source === 'missing' && !changes[k.key];
                const isChanged = changes[k.key] !== undefined;

                return (
                  <tr
                    key={k.key}
                    className={`border-b transition ${
                      isMissing ? 'bg-red-50/50' : isChanged ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <code className="text-xs text-muted-foreground">{k.key}</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{k.enValue}</td>
                    <td className="px-4 py-2">
                      {locale === 'en' ? (
                        <span className="text-sm">{k.enValue}</span>
                      ) : (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) => handleValueChange(k.key, e.target.value)}
                          placeholder={k.enValue}
                          className={`w-full rounded border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary ${
                            isMissing ? 'border-red-300' : 'border-transparent hover:border-border'
                          }`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isMissing ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          Missing
                        </span>
                      ) : isChanged ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          Changed
                        </span>
                      ) : k.source === 'db' ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          File
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredKeys.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No translations found matching your filters
            </div>
          )}
        </div>
      )}
    </div>
  );
}
