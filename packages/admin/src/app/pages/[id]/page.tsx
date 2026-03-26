'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageBuilderEditor } from '@/components/page-builder/editor';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageData {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  content: Record<string, unknown> | null;
  isHomepage: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface LocaleInfo {
  locale: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
}

interface PageTranslation {
  id: string;
  pageId: string;
  locale: string;
  title: string | null;
  content: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
}

export default function PageEditorPage() {
  const params = useParams();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // i18n state
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [defaultLocale, setDefaultLocale] = useState<string>('en');
  const [availableLocales, setAvailableLocales] = useState<Array<{ locale: string; name: string }>>(
    [],
  );
  const [translationCache, setTranslationCache] = useState<Record<string, PageTranslation>>({});

  const pageId = params.id as string;

  // Fetch available locales
  useEffect(() => {
    async function loadLocales() {
      try {
        const res = await fetch(
          `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/api/v1/public/translations`,
        );
        if (res.ok) {
          const json = (await res.json()) as {
            data: LocaleInfo[];
          };
          const locales = json.data ?? [];
          setAvailableLocales(
            locales.map((l) => ({ locale: l.locale, name: l.nativeName || l.name })),
          );
          const def = locales.find((l) => l.isDefault);
          if (def) {
            setDefaultLocale(def.locale);
            setCurrentLocale(def.locale);
          }
        }
      } catch {
        // Locales not available — single locale mode
      }
    }
    loadLocales();
  }, []);

  // Fetch page data
  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient<{ data: PageData }>(`/pages/${pageId}`);
        setPage(data.data);
      } catch {
        setError('Page not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pageId]);

  // Load translation for a locale
  const loadTranslation = useCallback(
    async (locale: string): Promise<PageTranslation | null> => {
      if (translationCache[locale]) return translationCache[locale];
      try {
        const res = await apiClient<{ data: PageTranslation }>(
          `/pages/${pageId}/translations/${locale}`,
        );
        const translation = res.data;
        setTranslationCache((prev) => ({ ...prev, [locale]: translation }));
        return translation;
      } catch {
        return null;
      }
    },
    [pageId, translationCache],
  );

  // Get the content for the current locale
  const getContentForLocale = useCallback(
    (locale: string): string | null => {
      if (locale === defaultLocale) {
        // Default locale uses the main page content
        return page?.content ? JSON.stringify(page.content) : null;
      }
      const translation = translationCache[locale];
      if (translation?.content) {
        return JSON.stringify(translation.content);
      }
      // Fall back to default page content
      return page?.content ? JSON.stringify(page.content) : null;
    },
    [page, defaultLocale, translationCache],
  );

  const handleLocaleChange = useCallback(
    async (newLocale: string) => {
      if (newLocale === currentLocale) return;

      // Load translation for the new locale if needed
      if (newLocale !== defaultLocale) {
        await loadTranslation(newLocale);
      }

      setCurrentLocale(newLocale);
    },
    [currentLocale, defaultLocale, loadTranslation],
  );

  const handleSave = useCallback(
    async (content: string) => {
      if (!page) return;
      setSaving(true);
      try {
        const contentJson = JSON.parse(content);

        if (currentLocale === defaultLocale) {
          // Save to main page
          await apiClient(`/pages/${page.id}`, {
            method: 'PUT',
            body: JSON.stringify({ content: contentJson }),
          });
          setPage((prev) => (prev ? { ...prev, content: contentJson } : prev));
        } else {
          // Save as translation
          await apiClient(`/pages/${page.id}/translations/${currentLocale}`, {
            method: 'PUT',
            body: JSON.stringify({ content: contentJson }),
          });
          // Update cache
          setTranslationCache((prev) => ({
            ...prev,
            [currentLocale]: {
              ...(prev[currentLocale] ?? {
                id: '',
                pageId: page.id,
                locale: currentLocale,
                title: null,
                seoTitle: null,
                seoDescription: null,
              }),
              content: contentJson,
            } as PageTranslation,
          }));
        }
      } catch {
        alert('Failed to save page');
      } finally {
        setSaving(false);
      }
    },
    [page, currentLocale, defaultLocale],
  );

  const handlePublish = useCallback(async () => {
    if (!page) return;
    try {
      await apiClient(`/pages/${page.id}/publish`, { method: 'PUT' });
      setPage((prev) => (prev ? { ...prev, status: 'published' } : prev));
      alert('Page published!');
    } catch (error) {
      console.error('[PageEditor] Failed to publish:', error);
      alert('Failed to publish page');
    }
  }, [page]);

  const handlePreview = useCallback(() => {
    if (!page) return;
    const storefrontUrl =
      process.env['NEXT_PUBLIC_STOREFRONT_URL'] ?? 'https://forkcart.heynyx.dev';
    const path = page.isHomepage ? '/' : `/p/${page.slug}`;
    const localePrefix = currentLocale !== defaultLocale ? `/${currentLocale}` : '';
    window.open(`${storefrontUrl}${localePrefix}${path}`, '_blank');
  }, [page, currentLocale, defaultLocale]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-500">{error ?? 'Page not found'}</p>
        <Link href="/pages" className="text-emerald-500 hover:underline">
          ← Back to Pages
        </Link>
      </div>
    );
  }

  const initialContent = getContentForLocale(currentLocale);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center gap-2 border-b bg-gray-50 px-4">
        <Link
          href="/pages"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Pages
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{page.title}</span>
        {page.status === 'published' && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Published
          </span>
        )}
        {currentLocale !== defaultLocale && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {currentLocale.toUpperCase()}
          </span>
        )}
      </div>
      <PageBuilderEditor
        key={currentLocale}
        initialContent={initialContent}
        onSave={handleSave}
        onPublish={handlePublish}
        onPreview={handlePreview}
        pageTitle={page.title}
        pageStatus={page.status}
        saving={saving}
        currentLocale={currentLocale}
        defaultLocale={defaultLocale}
        availableLocales={availableLocales}
        onLocaleChange={handleLocaleChange}
      />
    </div>
  );
}
