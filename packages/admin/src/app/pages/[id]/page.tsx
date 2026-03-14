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
}

export default function PageEditorPage() {
  const params = useParams();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageId = params.id as string;

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

  const handleSave = useCallback(
    async (content: string) => {
      if (!page) return;
      setSaving(true);
      try {
        // Parse the Craft.js serialized JSON string to store as JSONB
        const contentJson = JSON.parse(content);
        await apiClient(`/pages/${page.id}`, {
          method: 'PUT',
          body: JSON.stringify({ content: contentJson }),
        });
      } catch {
        alert('Failed to save page');
      } finally {
        setSaving(false);
      }
    },
    [page],
  );

  const handlePublish = useCallback(async () => {
    if (!page) return;
    try {
      await apiClient(`/pages/${page.id}/publish`, { method: 'PUT' });
      setPage((prev) => (prev ? { ...prev, status: 'published' } : prev));
    } catch {
      alert('Failed to publish page');
    }
  }, [page]);

  const handlePreview = useCallback(() => {
    if (!page) return;
    window.open(`/${page.slug}`, '_blank');
  }, [page]);

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
        <Link href="/pages" className="text-blue-600 hover:underline">
          ← Back to Pages
        </Link>
      </div>
    );
  }

  // Convert stored JSONB content back to Craft.js serialized string
  const initialContent = page.content ? JSON.stringify(page.content) : null;

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
      </div>
      <PageBuilderEditor
        initialContent={initialContent}
        onSave={handleSave}
        onPublish={handlePublish}
        onPreview={handlePreview}
        pageTitle={page.title}
        saving={saving}
      />
    </div>
  );
}
