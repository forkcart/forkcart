'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { FolderTree } from 'lucide-react';

export interface CategoryGridProps {
  title?: string;
  columns?: 2 | 3 | 4;
  limit?: number;
  style?: 'card' | 'minimal';
  className?: string;
}

export const CategoryGrid: UserComponent<CategoryGridProps> = ({
  title = 'Shop by Category',
  columns = 4,
  limit = 4,
  style = 'card',
  className,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={cn('w-full py-8', className)}
    >
      {title && <h2 className="mb-6 text-2xl font-bold text-gray-900">{title}</h2>}
      <div className={cn('grid gap-4', gridCols[columns])}>
        {Array.from({ length: limit }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center justify-center rounded-lg transition-colors',
              style === 'card'
                ? 'aspect-[4/3] bg-gray-100 hover:bg-gray-200'
                : 'border bg-white p-6 hover:border-gray-400',
            )}
          >
            <div className="text-center">
              <FolderTree className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        ↑ Category Grid Preview — {limit} categories
      </p>
    </div>
  );
};

function CategoryGridSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as CategoryGridProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Section Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? ''}
          onChange={(e) => setProp((p: CategoryGridProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Style</label>
        <div className="flex gap-2">
          {(['card', 'minimal'] as const).map((s) => (
            <button
              key={s}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                props.style === s && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: CategoryGridProps) => (p.style = s))}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm',
                props.columns === n && 'border-blue-500 bg-blue-50 text-blue-700',
              )}
              onClick={() => setProp((p: CategoryGridProps) => (p.columns = n))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Categories to Show</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.limit ?? 4}
          onChange={(e) => setProp((p: CategoryGridProps) => (p.limit = Number(e.target.value)))}
        >
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={6}>6</option>
          <option value={8}>8</option>
        </select>
      </div>
    </div>
  );
}

CategoryGrid.craft = {
  displayName: 'Category Grid',
  props: {
    title: 'Shop by Category',
    columns: 4 as const,
    limit: 4,
    style: 'card' as const,
  },
  related: {
    settings: CategoryGridSettings,
  },
};
