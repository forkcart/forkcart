'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';
import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';

export interface ProductGridProps {
  title?: string;
  columns?: 2 | 3 | 4;
  limit?: number;
  source?: 'latest' | 'featured' | 'category';
  categorySlug?: string;
  showPrice?: boolean;
  showButton?: boolean;
  className?: string;
}

/** Preview placeholder for the admin editor */
export const ProductGrid: UserComponent<ProductGridProps> = ({
  title = 'Our Products',
  columns = 4,
  limit = 8,
  source = 'latest',
  categorySlug,
  showPrice = true,
  showButton = true,
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <StyledBlock className={cn('w-full py-8', className)}>
      {title && (
        <h2
          className={cn(
            'mb-6 text-2xl font-bold text-gray-900 outline-none',
            selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
          )}
          contentEditable={selected}
          suppressContentEditableWarning
          onBlur={(e) =>
            setProp((p: ProductGridProps) => (p.title = e.currentTarget.textContent ?? ''))
          }
        >
          {title}
        </h2>
      )}
      <div className={cn('grid gap-6', gridCols[columns])}>
        {Array.from({ length: limit }, (_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-gray-100">
              <Package className="h-10 w-10 text-gray-300" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              {showPrice && <div className="h-4 w-1/3 rounded bg-gray-100" />}
              {showButton && <div className="h-8 w-full rounded bg-gray-900" />}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        ↑ Product Grid Preview — {limit} {source} products
        {source === 'category' && categorySlug && ` from "${categorySlug}"`}
      </p>
    </StyledBlock>
  );
};

function ProductGridSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ProductGridProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Section Title</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.title ?? ''}
          onChange={(e) => setProp((p: ProductGridProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Source</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.source ?? 'latest'}
          onChange={(e) =>
            setProp(
              (p: ProductGridProps) => (p.source = e.target.value as ProductGridProps['source']),
            )
          }
        >
          <option value="latest">Latest Products</option>
          <option value="featured">Featured / Best Sellers</option>
          <option value="category">By Category</option>
        </select>
      </div>
      {props.source === 'category' && (
        <div>
          <label className="mb-1 block text-sm font-medium">Category Slug</label>
          <input
            type="text"
            placeholder="e.g. electronics"
            className="w-full rounded border p-2 text-sm"
            value={props.categorySlug ?? ''}
            onChange={(e) => setProp((p: ProductGridProps) => (p.categorySlug = e.target.value))}
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm',
                props.columns === n && 'border-emerald-500 bg-emerald-50 text-emerald-600',
              )}
              onClick={() => setProp((p: ProductGridProps) => (p.columns = n))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Products to Show</label>
        <select
          className="w-full rounded border p-2 text-sm"
          value={props.limit ?? 8}
          onChange={(e) => setProp((p: ProductGridProps) => (p.limit = Number(e.target.value)))}
        >
          <option value={4}>4</option>
          <option value={8}>8</option>
          <option value={12}>12</option>
          <option value={16}>16</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.showPrice ?? true}
            onChange={(e) => setProp((p: ProductGridProps) => (p.showPrice = e.target.checked))}
          />
          Show Price
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.showButton ?? true}
            onChange={(e) => setProp((p: ProductGridProps) => (p.showButton = e.target.checked))}
          />
          Show Add to Cart Button
        </label>
      </div>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

ProductGrid.craft = {
  displayName: 'Product Grid',
  props: {
    title: 'Our Products',
    columns: 4 as const,
    limit: 8,
    source: 'latest' as const,
    categorySlug: '',
    showPrice: true,
    showButton: true,
  },
  related: {
    settings: ProductGridSettings,
  },
};
