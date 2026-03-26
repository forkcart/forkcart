'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { cn } from '@/lib/utils';
import { Package, ShoppingCart } from 'lucide-react';
import { StyleSettings } from '../shared/style-settings';
import { StyledBlock } from '../shared/styled-block';

export interface FeaturedProductProps {
  productSlug?: string;
  layout?: 'left' | 'right';
  backgroundColor?: string;
  showDescription?: boolean;
  ctaText?: string;
  className?: string;
}

export const FeaturedProduct: UserComponent<FeaturedProductProps> = ({
  productSlug,
  layout = 'left',
  backgroundColor = '#f9fafb',
  showDescription = true,
  ctaText = 'Add to Cart',
  className,
}) => {
  const {
    selected,
    actions: { setProp },
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <StyledBlock className={cn('w-full overflow-hidden rounded-xl', className)}>
      <div style={{ backgroundColor }}>
        <div
          className={cn(
            'flex flex-col items-center gap-8 p-8 md:flex-row md:p-12',
            layout === 'right' && 'md:flex-row-reverse',
          )}
        >
          {/* Image placeholder */}
          <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-lg bg-white shadow-sm">
            <Package className="h-20 w-20 text-gray-200" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            <span className="text-sm font-medium uppercase tracking-wider text-emerald-500">
              Featured
            </span>
            <div className="h-8 w-3/4 rounded bg-gray-300" />
            {showDescription && (
              <>
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-5/6 rounded bg-gray-200" />
              </>
            )}
            <div className="flex items-center gap-4 pt-2">
              <div className="h-8 w-24 rounded bg-gray-300" />
              <button className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white">
                <ShoppingCart className="h-4 w-4" />
                <span
                  className={cn(
                    'outline-none',
                    selected && 'cursor-text rounded ring-1 ring-emerald-300 ring-offset-1',
                  )}
                  contentEditable={selected}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setProp(
                      (p: FeaturedProductProps) => (p.ctaText = e.currentTarget.textContent ?? ''),
                    )
                  }
                >
                  {ctaText}
                </span>
              </button>
            </div>
            {productSlug ? (
              <p className="text-xs text-gray-400">Product: /{productSlug}</p>
            ) : (
              <p className="text-xs text-gray-400">Set a product slug in settings →</p>
            )}
          </div>
        </div>
      </div>
    </StyledBlock>
  );
};

function FeaturedProductSettings() {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as FeaturedProductProps }));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Product Slug</label>
        <input
          type="text"
          placeholder="e.g. wireless-headphones"
          className="w-full rounded border p-2 text-sm"
          value={props.productSlug ?? ''}
          onChange={(e) => setProp((p: FeaturedProductProps) => (p.productSlug = e.target.value))}
        />
        <p className="mt-1 text-xs text-gray-400">Enter the product URL slug to feature</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Image Position</label>
        <div className="flex gap-2">
          {(['left', 'right'] as const).map((l) => (
            <button
              key={l}
              className={cn(
                'flex-1 rounded border px-3 py-1.5 text-sm capitalize',
                props.layout === l && 'border-emerald-500 bg-emerald-50 text-emerald-600',
              )}
              onClick={() => setProp((p: FeaturedProductProps) => (p.layout = l))}
            >
              Image {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">CTA Text</label>
        <input
          type="text"
          className="w-full rounded border p-2 text-sm"
          value={props.ctaText ?? 'Add to Cart'}
          onChange={(e) => setProp((p: FeaturedProductProps) => (p.ctaText = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Background Color</label>
        <input
          type="color"
          className="h-10 w-full rounded border"
          value={props.backgroundColor ?? '#f9fafb'}
          onChange={(e) =>
            setProp((p: FeaturedProductProps) => (p.backgroundColor = e.target.value))
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.showDescription ?? true}
          onChange={(e) =>
            setProp((p: FeaturedProductProps) => (p.showDescription = e.target.checked))
          }
        />
        Show Description
      </label>
      <hr className="my-2" />
      <StyleSettings />
    </div>
  );
}

FeaturedProduct.craft = {
  displayName: 'Featured Product',
  props: {
    productSlug: '',
    layout: 'left' as const,
    backgroundColor: '#f9fafb',
    showDescription: true,
    ctaText: 'Add to Cart',
  },
  related: {
    settings: FeaturedProductSettings,
  },
};
