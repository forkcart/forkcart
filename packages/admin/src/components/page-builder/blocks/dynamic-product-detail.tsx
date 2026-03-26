'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { ShoppingBag } from 'lucide-react';

export interface DynamicProductDetailProps {
  showReviews?: boolean;
  showRelated?: boolean;
  imagePosition?: 'left' | 'right';
}

/** Dynamic Product Detail — renders the actual product on the storefront */
export const DynamicProductDetail: UserComponent<DynamicProductDetailProps> = ({
  showReviews = true,
  showRelated = true,
  imagePosition: _imagePosition = 'left',
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="mx-auto w-full max-w-6xl px-6 py-12"
    >
      <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-8">
        <div className="mb-4 flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-emerald-500" />
          <span className="text-lg font-semibold text-emerald-800">Product Detail</span>
          <span className="rounded bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-600">
            Dynamic
          </span>
        </div>
        <p className="text-sm text-emerald-600">
          This block renders the actual product with images, price, variants, and Add to Cart
          button. The content is loaded dynamically from the product data.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-100 p-4 text-center text-xs text-emerald-500">
            📸 Product Images
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-emerald-100" />
            <div className="h-6 w-1/2 rounded bg-emerald-100" />
            <div className="h-3 w-full rounded bg-emerald-100" />
            <div className="mt-4 h-10 w-full rounded bg-emerald-200" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {showReviews && (
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-500">
              ⭐ Reviews enabled
            </span>
          )}
          {showRelated && (
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-500">
              📦 Related products enabled
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

DynamicProductDetail.craft = {
  displayName: 'Product Detail',
  props: {
    showReviews: true,
    showRelated: true,
    imagePosition: 'left',
  },
  related: {
    settings: ProductDetailSettings,
  },
};

function ProductDetailSettings() {
  const {
    actions: { setProp },
    showReviews,
    showRelated,
  } = useNode((node) => ({
    showReviews: node.data.props.showReviews,
    showRelated: node.data.props.showRelated,
  }));

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showReviews}
          onChange={(e) =>
            setProp((props: DynamicProductDetailProps) => (props.showReviews = e.target.checked))
          }
        />
        Show Reviews
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showRelated}
          onChange={(e) =>
            setProp((props: DynamicProductDetailProps) => (props.showRelated = e.target.checked))
          }
        />
        Show Related Products
      </label>
    </div>
  );
}
