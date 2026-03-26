'use client';

import { useEditor } from '@craftjs/core';
import { Undo2, Redo2, Monitor, Smartphone, Tablet, Eye, Save, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export type DeviceView = 'desktop' | 'tablet' | 'mobile';

interface ToolbarProps {
  onSave: (content: string) => void;
  onPublish?: () => void;
  onPreview?: () => void;
  saving?: boolean;
  pageTitle?: string;
  pageStatus?: 'draft' | 'published' | 'archived';
  deviceView: DeviceView;
  onDeviceChange: (device: DeviceView) => void;
  currentLocale?: string;
  defaultLocale?: string;
  availableLocales?: Array<{ locale: string; name: string }>;
  onLocaleChange?: (locale: string) => void;
}

export function Toolbar({
  onSave,
  onPublish,
  onPreview,
  saving,
  pageTitle,
  pageStatus,
  deviceView,
  onDeviceChange,
  currentLocale,
  defaultLocale,
  availableLocales,
  onLocaleChange,
}: ToolbarProps) {
  const { actions, query, canUndo, canRedo } = useEditor((_state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const [publishing, setPublishing] = useState(false);

  const handleSave = () => {
    const json = query.serialize();
    onSave(json);
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    setPublishing(true);
    try {
      // Save first, then publish
      const json = query.serialize();
      onSave(json);
      // Small delay to ensure save completes
      await new Promise((r) => setTimeout(r, 500));
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-white px-4">
      {/* Left: Page info + locale selector */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-gray-900">{pageTitle ?? 'Page Builder'}</h2>
        {availableLocales && availableLocales.length > 1 && onLocaleChange && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-gray-400" />
              <select
                value={currentLocale ?? defaultLocale ?? 'en'}
                onChange={(e) => onLocaleChange(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {availableLocales.map((loc) => (
                  <option key={loc.locale} value={loc.locale}>
                    {loc.name}
                    {loc.locale === defaultLocale ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Center: Device preview + undo/redo */}
      <div className="flex items-center gap-1">
        <button
          className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => actions.history.undo()}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          onClick={() => actions.history.redo()}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <div className="mx-2 h-6 w-px bg-gray-200" />
        {(
          [
            { view: 'desktop' as const, icon: Monitor, label: 'Desktop' },
            { view: 'tablet' as const, icon: Tablet, label: 'Tablet' },
            { view: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
          ] as const
        ).map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            className={cn(
              'rounded p-2 transition-colors',
              deviceView === view
                ? 'bg-emerald-50 text-emerald-500'
                : 'text-gray-500 hover:bg-gray-100',
            )}
            onClick={() => onDeviceChange(view)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onPreview && (
          <button
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={onPreview}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        )}
        <button
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        {onPublish && (
          <button
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            onClick={handlePublish}
            disabled={publishing || saving}
          >
            {publishing ? 'Publishing...' : pageStatus === 'published' ? '✓ Published' : 'Publish'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Returns the CSS max-width for the device viewport */
export function getDeviceWidth(device: DeviceView): string | undefined {
  switch (device) {
    case 'mobile':
      return '375px';
    case 'tablet':
      return '768px';
    default:
      return undefined;
  }
}
