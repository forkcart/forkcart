'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface Language {
  locale: string;
  name: string;
  nativeName: string;
}

interface TranslationData {
  id?: string;
  name: string | null;
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

interface ProductTranslationsProps {
  productId: string;
  product?: {
    name?: string;
    description?: string | null;
    shortDescription?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
}

const EMPTY_TRANSLATION: TranslationData = {
  name: '',
  description: '',
  shortDescription: '',
  metaTitle: '',
  metaDescription: '',
};

export function ProductTranslations({ productId, product }: ProductTranslationsProps) {
  const queryClient = useQueryClient();
  const [activeLocale, setActiveLocale] = useState<string | null>(null);
  const [form, setForm] = useState<TranslationData>(EMPTY_TRANSLATION);

  // Load available languages
  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: () => apiClient<{ data: Language[] }>('/translations'),
  });

  // Load existing translations for this product
  const { data: translationsData } = useQuery({
    queryKey: ['product-translations', productId],
    queryFn: () => apiClient<{ data: TranslationData[] }>(`/products/${productId}/translations`),
  });

  const languages = (languagesData?.data ?? []).filter((l) => l.locale !== 'en');

  // Set first locale as active by default
  useEffect(() => {
    if (!activeLocale && languages.length > 0) {
      setActiveLocale(languages[0]!.locale);
    }
  }, [languages, activeLocale]);

  // Load form data when active locale changes
  useEffect(() => {
    if (!activeLocale || !translationsData?.data) {
      setForm(EMPTY_TRANSLATION);
      return;
    }
    const existing = translationsData.data.find(
      (t: TranslationData & { locale?: string }) =>
        (t as { locale?: string }).locale === activeLocale,
    );
    if (existing) {
      setForm({
        name: existing.name ?? '',
        description: existing.description ?? '',
        shortDescription: existing.shortDescription ?? '',
        metaTitle: existing.metaTitle ?? '',
        metaDescription: existing.metaDescription ?? '',
      });
    } else {
      setForm(EMPTY_TRANSLATION);
    }
  }, [activeLocale, translationsData]);

  // Save translation
  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient(`/products/${productId}/translations/${activeLocale}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', productId] });
    },
  });

  // AI auto-translate
  const autoTranslateMutation = useMutation({
    mutationFn: () =>
      apiClient<{ data: TranslationData }>(
        `/products/${productId}/translations/${activeLocale}/auto-translate`,
        { method: 'POST' },
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', productId] });
      if (result?.data) {
        setForm({
          name: result.data.name ?? '',
          description: result.data.description ?? '',
          shortDescription: result.data.shortDescription ?? '',
          metaTitle: result.data.metaTitle ?? '',
          metaDescription: result.data.metaDescription ?? '',
        });
      }
    },
  });

  if (languages.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Translations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No additional languages configured. Add languages in Settings → Translations.
        </p>
      </div>
    );
  }

  const updateField = (field: keyof TranslationData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Translations</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => autoTranslateMutation.mutate()}
            disabled={autoTranslateMutation.isPending || !activeLocale}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {autoTranslateMutation.isPending ? 'Translating...' : '🤖 AI Translate'}
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !activeLocale}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Language tabs */}
      <div className="mt-4 flex gap-1 border-b">
        {languages.map((lang) => (
          <button
            key={lang.locale}
            type="button"
            onClick={() => setActiveLocale(lang.locale)}
            className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              activeLocale === lang.locale
                ? 'border-b-2 border-primary bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {lang.nativeName || lang.name} ({lang.locale})
          </button>
        ))}
      </div>

      {/* Translation form */}
      {activeLocale && (
        <div className="mt-4 space-y-4">
          {/* Name */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={product?.name ?? 'Product name'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Original (English)</label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {product?.name ?? '—'}
              </div>
            </div>
          </div>

          {/* Short Description */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Short Description</label>
              <textarea
                value={form.shortDescription ?? ''}
                onChange={(e) => updateField('shortDescription', e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={product?.shortDescription ?? 'Short description'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Original (English)</label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {product?.shortDescription ?? '—'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={5}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={product?.description ?? 'Full description'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Original (English)</label>
              <div className="max-h-[140px] overflow-auto rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {product?.description ?? '—'}
              </div>
            </div>
          </div>

          {/* Meta Title */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Meta Title</label>
              <input
                type="text"
                value={form.metaTitle ?? ''}
                onChange={(e) => updateField('metaTitle', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={product?.metaTitle ?? 'SEO title'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Original (English)</label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {product?.metaTitle ?? '—'}
              </div>
            </div>
          </div>

          {/* Meta Description */}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Meta Description</label>
              <textarea
                value={form.metaDescription ?? ''}
                onChange={(e) => updateField('metaDescription', e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={product?.metaDescription ?? 'SEO description'}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Original (English)</label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {product?.metaDescription ?? '—'}
              </div>
            </div>
          </div>

          {/* Status messages */}
          {saveMutation.isSuccess && <p className="text-sm text-green-600">✓ Translation saved</p>}
          {saveMutation.isError && (
            <p className="text-sm text-destructive">
              Error: {(saveMutation.error as Error).message}
            </p>
          )}
          {autoTranslateMutation.isSuccess && (
            <p className="text-sm text-green-600">✓ AI translation complete</p>
          )}
          {autoTranslateMutation.isError && (
            <p className="text-sm text-destructive">
              AI Error: {(autoTranslateMutation.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
