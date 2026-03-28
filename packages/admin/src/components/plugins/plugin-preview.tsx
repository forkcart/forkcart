'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Loader2,
  Puzzle,
  LayoutGrid,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Layers,
  PanelTop,
  Settings2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SlotContent {
  content: string;
  pluginName: string;
  order?: number;
}

interface PageBuilderBlock {
  pluginName: string;
  name: string;
  label: string;
  icon?: string;
  description?: string;
  content?: string;
  defaultSlot?: string;
  defaultOrder?: number;
  pages?: string[];
}

interface AdminPage {
  pluginName: string;
  path: string;
  label: string;
  icon?: string;
}

interface AdminPageContent {
  html: string;
  source: string;
}

type PreviewTab = 'slots' | 'blocks' | 'admin';
type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const VIEWPORT_ICONS: Record<ViewportSize, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PluginPreviewProps {
  pluginId: string;
  pluginName: string;
  isActive: boolean;
  onClose: () => void;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PluginPreview({ pluginId, pluginName, isActive, onClose }: PluginPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('slots');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');

  // Fetch storefront slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['plugin-preview-slots'],
    queryFn: () =>
      apiClient<{ data: Record<string, Array<{ pluginName: string; order: number }>> }>(
        '/public/plugins/slots',
      ),
  });

  // Fetch PageBuilder blocks
  const { data: blocksData, isLoading: blocksLoading } = useQuery({
    queryKey: ['plugin-preview-blocks'],
    queryFn: () => apiClient<{ data: PageBuilderBlock[] }>('/public/plugins/blocks'),
  });

  // Fetch admin pages
  const { data: adminPagesData, isLoading: adminLoading } = useQuery({
    queryKey: ['plugin-admin-pages'],
    queryFn: () => apiClient<{ data: AdminPage[] }>('/plugins/admin-pages'),
  });

  // Filter data for this plugin
  const pluginSlots: Array<{ slotName: string; contents: SlotContent[] }> = [];
  if (slotsData?.data) {
    for (const [slotName, entries] of Object.entries(slotsData.data)) {
      const matching = entries.filter((e) => e.pluginName === pluginName);
      if (matching.length > 0) {
        pluginSlots.push({
          slotName,
          contents: matching.map((m) => ({ ...m, content: '' })),
        });
      }
    }
  }

  const pluginBlocks = (blocksData?.data ?? []).filter((b) => b.pluginName === pluginName);

  const pluginAdminPages = (adminPagesData?.data ?? []).filter((p) => p.pluginName === pluginName);

  const isLoading = slotsLoading || blocksLoading || adminLoading;

  const tabCounts = {
    slots: pluginSlots.length,
    blocks: pluginBlocks.length,
    admin: pluginAdminPages.length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Plugin Preview</h2>
              <p className="text-sm text-muted-foreground">{pluginName}</p>
            </div>
            {!isActive && (
              <Badge variant="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Inactive
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Viewport Switcher */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
              {(Object.keys(VIEWPORT_WIDTHS) as ViewportSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewport === size
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title={size.charAt(0).toUpperCase() + size.slice(1)}
                >
                  {VIEWPORT_ICONS[size]}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-6">
          <PreviewTabButton
            active={activeTab === 'slots'}
            onClick={() => setActiveTab('slots')}
            icon={<Layers className="h-4 w-4" />}
            label="Storefront Slots"
            count={tabCounts.slots}
          />
          <PreviewTabButton
            active={activeTab === 'blocks'}
            onClick={() => setActiveTab('blocks')}
            icon={<LayoutGrid className="h-4 w-4" />}
            label="PageBuilder Blocks"
            count={tabCounts.blocks}
          />
          <PreviewTabButton
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
            icon={<Settings2 className="h-4 w-4" />}
            label="Admin Widgets"
            count={tabCounts.admin}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading preview...
            </div>
          ) : !isActive ? (
            <InactiveNotice pluginName={pluginName} />
          ) : (
            <div className="mx-auto transition-all" style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}>
              {activeTab === 'slots' && <SlotsPreview slots={pluginSlots} />}
              {activeTab === 'blocks' && <BlocksPreview blocks={pluginBlocks} />}
              {activeTab === 'admin' && (
                <AdminPreview pages={pluginAdminPages} pluginId={pluginId} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function PreviewTabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
          active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Inactive Notice ────────────────────────────────────────────────────────

function InactiveNotice({ pluginName }: { pluginName: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h3 className="mt-4 text-lg font-semibold text-amber-900">Plugin is inactive</h3>
      <p className="mt-2 text-sm text-amber-700">
        Activate <strong>{pluginName}</strong> to preview its storefront slots, PageBuilder blocks,
        and admin widgets. Inactive plugins don&apos;t register their content.
      </p>
    </div>
  );
}

// ─── Slots Preview ──────────────────────────────────────────────────────────

function SlotsPreview({ slots }: { slots: Array<{ slotName: string; contents: SlotContent[] }> }) {
  if (slots.length === 0) {
    return (
      <EmptyPreview
        icon={<Layers className="h-10 w-10" />}
        title="No storefront slots"
        description="This plugin doesn't register any storefront slots. Slots inject HTML into designated areas of the storefront (header, footer, product pages, etc.)."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Storefront slots where this plugin injects content:
      </p>
      {slots.map(({ slotName, contents }) => (
        <SlotCard key={slotName} slotName={slotName} entryCount={contents.length} />
      ))}
    </div>
  );
}

function SlotCard({ slotName, entryCount }: { slotName: string; entryCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadContent() {
    if (content !== null) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient<{ data: SlotContent[] }>(
        `/public/plugins/slots/${encodeURIComponent(slotName)}`,
      );
      const html = (res.data ?? []).map((c) => c.content).join('\n');
      setContent(html);
      setExpanded(true);
    } catch {
      setContent('<p style="color:#dc2626">Failed to load slot content</p>');
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <button
        onClick={loadContent}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100">
            <PanelTop className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{slotName}</p>
            <p className="text-xs text-muted-foreground">
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{expanded ? 'Collapse' : 'Preview'}</span>
        </div>
      </button>
      {expanded && content !== null && (
        <div className="border-t bg-white p-4">
          <div className="rounded-md border bg-gray-50 p-4">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Blocks Preview ─────────────────────────────────────────────────────────

function BlocksPreview({ blocks }: { blocks: PageBuilderBlock[] }) {
  if (blocks.length === 0) {
    return (
      <EmptyPreview
        icon={<LayoutGrid className="h-10 w-10" />}
        title="No PageBuilder blocks"
        description="This plugin doesn't provide any PageBuilder blocks. Blocks are drag-and-drop components that merchants can place on any page via the PageBuilder."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">PageBuilder blocks provided by this plugin:</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {blocks.map((block) => (
          <BlockCard key={`${block.pluginName}:${block.name}`} block={block} />
        ))}
      </div>
    </div>
  );
}

function BlockCard({ block }: { block: PageBuilderBlock }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-lg">
          {block.icon || '🧩'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{block.label || block.name}</p>
          <p className="truncate text-xs text-muted-foreground">{block.pluginName}</p>
          {block.description && (
            <p className="mt-1 text-xs text-muted-foreground">{block.description}</p>
          )}
        </div>
      </div>
      {(block.defaultSlot || block.pages) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {block.defaultSlot && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              Slot: {block.defaultSlot}
            </span>
          )}
          {block.pages?.map((page) => (
            <span
              key={page}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {page}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Preview ──────────────────────────────────────────────────────────

function AdminPreview({ pages, pluginId }: { pages: AdminPage[]; pluginId: string }) {
  const [selectedPage, setSelectedPage] = useState<AdminPage | null>(null);

  if (pages.length === 0) {
    return (
      <EmptyPreview
        icon={<Settings2 className="h-10 w-10" />}
        title="No admin widgets"
        description="This plugin doesn't register any custom admin pages. Plugins can add dashboards, reports, or configuration panels to the admin area."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Admin pages registered by this plugin:</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {pages.map((page) => (
          <button
            key={page.path}
            onClick={() => setSelectedPage(selectedPage?.path === page.path ? null : page)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
              selectedPage?.path === page.path
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'hover:border-muted-foreground/30 hover:bg-muted/50',
            )}
          >
            <Puzzle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{page.label}</p>
              <p className="text-xs text-muted-foreground">{page.path}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedPage && <AdminPagePreview pluginId={pluginId} pagePath={selectedPage.path} />}
    </div>
  );
}

function AdminPagePreview({ pluginId, pagePath }: { pluginId: string; pagePath: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['plugin-admin-page-content', pluginId, pagePath],
    queryFn: () =>
      apiClient<{ data: AdminPageContent }>(
        `/plugins/admin-pages/${pluginId}/content?path=${encodeURIComponent(pagePath)}`,
      ),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading page content...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">Failed to load page content</p>
        <p className="mt-1 text-xs text-red-600">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const html = data?.data?.html ?? '';

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">Page Preview — {pagePath}</p>
      </div>
      <div className="p-4">
        <div
          className="rounded-md border bg-white p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyPreview({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
      <div className="mx-auto text-muted-foreground/40">{icon}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default PluginPreview;
