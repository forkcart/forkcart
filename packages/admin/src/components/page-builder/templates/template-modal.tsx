'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pageTemplates, type PageTemplate } from './index';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PageTemplate, title: string, slug: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function TemplateModal({ open, onClose, onSelect }: TemplateModalProps) {
  const [selected, setSelected] = useState<PageTemplate>(pageTemplates[0]!);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);

  if (!open) return null;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (autoSlug) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setAutoSlug(false);
    setSlug(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    onSelect(selected, title.trim(), slug.trim());
    setTitle('');
    setSlug('');
    setAutoSlug(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Page</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Page details */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Page Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. About Us"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">URL Slug</label>
                <div className="flex items-center rounded-lg border text-sm focus-within:ring-2 focus-within:ring-emerald-500">
                  <span className="border-r bg-gray-50 px-3 py-2 text-gray-400">/p/</span>
                  <input
                    type="text"
                    required
                    className="w-full rounded-r-lg px-3 py-2 outline-none"
                    placeholder="about-us"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Template selection */}
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Choose a Template
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {pageTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-all hover:border-emerald-300',
                    selected.id === template.id
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-gray-200',
                  )}
                  onClick={() => setSelected(template)}
                >
                  <span className="mb-2 block text-2xl">{template.icon}</span>
                  <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !slug.trim()}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Create Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
