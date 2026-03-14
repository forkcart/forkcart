'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Plus, Edit, Trash2, Globe, FileText, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  isHomepage: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const statusBadge: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

export default function PagesListPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      const data = await apiClient<{ data: Page[] }>('/pages');
      setPages(data.data ?? []);
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const data = await apiClient<{ data: Page }>('/pages', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Page', slug: `page-${Date.now()}` }),
      });
      router.push(`/pages/${data.data.id}`);
    } catch (err) {
      alert('Failed to create page');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this page?')) return;
    try {
      await apiClient(`/pages/${id}`, { method: 'DELETE' });
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Failed to delete page');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-sm text-gray-500">Manage your store pages with the visual editor</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="mb-1 text-lg font-medium text-gray-900">No pages yet</h3>
          <p className="mb-4 text-sm text-gray-500">
            Create your first page with the drag-and-drop editor
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Page
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      {page.isHomepage && <Home className="h-4 w-4 text-blue-500" />}
                      <span className="text-sm font-medium text-gray-900">{page.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      /{page.slug}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        statusBadge[page.status],
                      )}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/pages/${page.id}`}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      {page.status === 'published' && (
                        <a
                          href={`/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                          title="View"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
