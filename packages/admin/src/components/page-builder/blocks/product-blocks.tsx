'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { ShoppingBag, Star, Minus, Plus, Heart } from 'lucide-react';
import { usePreviewProduct } from '../hooks/use-preview-product';

function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
}

// ─── Product Images ──────────────────────────────────────────────────────────

export interface ProductImagesBlockProps {
  layout?: 'grid' | 'gallery' | 'single';
  thumbnailPosition?: 'bottom' | 'left';
  aspectRatio?: 'square' | '4:3' | '3:4';
}

export const ProductImagesBlock: UserComponent<ProductImagesBlockProps> = ({
  layout = 'gallery',
}) => {
  const {
    connectors: { connect },
  } = useNode();
  const product = usePreviewProduct();
  const hasImages = product?.images && product.images.length > 0;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
        {hasImages ? (
          <img
            src={product!.images![0]!.url}
            alt={product!.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg className="h-32 w-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={0.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      {hasImages && layout !== 'single' && product!.images!.length > 1 && (
        <div className="mt-4 flex gap-3">
          {product!.images!.slice(0, 4).map((img, idx) => (
            <div
              key={img.id}
              className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${
                idx === 0 ? 'border-gray-900' : 'border-transparent opacity-60'
              }`}
            >
              <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

ProductImagesBlock.craft = {
  displayName: 'Product Images',
  props: { layout: 'gallery', thumbnailPosition: 'bottom', aspectRatio: 'square' },
  related: { settings: ProductImagesSettings },
};

function ProductImagesSettings() {
  const {
    actions: { setProp },
    layout,
    aspectRatio,
  } = useNode((node) => ({
    layout: node.data.props.layout,
    aspectRatio: node.data.props.aspectRatio,
  }));
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Layout</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={layout}
          onChange={(e) =>
            setProp((p: ProductImagesBlockProps) => (p.layout = e.target.value as 'grid'))
          }
        >
          <option value="gallery">Gallery (main + thumbnails)</option>
          <option value="grid">Grid</option>
          <option value="single">Single Image</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Aspect Ratio</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={aspectRatio}
          onChange={(e) =>
            setProp((p: ProductImagesBlockProps) => (p.aspectRatio = e.target.value as 'square'))
          }
        >
          <option value="square">Square (1:1)</option>
          <option value="4:3">Landscape (4:3)</option>
          <option value="3:4">Portrait (3:4)</option>
        </select>
      </div>
    </div>
  );
}

// ─── Product Title ───────────────────────────────────────────────────────────

export interface ProductTitleBlockProps {
  showSku?: boolean;
  showWishlist?: boolean;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ProductTitleBlock: UserComponent<ProductTitleBlockProps> = ({
  showSku = true,
  showWishlist = true,
  titleSize = 'lg',
}) => {
  const {
    connectors: { connect },
  } = useNode();
  const product = usePreviewProduct();
  const sizeClass = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' }[titleSize];

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
    >
      {showSku && product?.sku && (
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          SKU: {product.sku}
        </p>
      )}
      <div className="mt-2 flex items-start justify-between gap-4">
        <h1 className={`font-bold tracking-tight text-gray-900 ${sizeClass}`}>
          {product?.name ?? 'Product Name'}
        </h1>
        {showWishlist && (
          <button className="rounded-md p-2 text-gray-400 hover:text-red-500" disabled>
            <Heart className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

ProductTitleBlock.craft = {
  displayName: 'Product Title',
  props: { showSku: true, showWishlist: true, titleSize: 'lg' },
  related: { settings: ProductTitleSettings },
};

function ProductTitleSettings() {
  const {
    actions: { setProp },
    showSku,
    showWishlist,
    titleSize,
  } = useNode((node) => ({
    showSku: node.data.props.showSku,
    showWishlist: node.data.props.showWishlist,
    titleSize: node.data.props.titleSize,
  }));
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showSku}
          onChange={(e) => setProp((p: ProductTitleBlockProps) => (p.showSku = e.target.checked))}
        />
        Show SKU
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showWishlist}
          onChange={(e) =>
            setProp((p: ProductTitleBlockProps) => (p.showWishlist = e.target.checked))
          }
        />
        Show Wishlist Button
      </label>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Title Size</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={titleSize}
          onChange={(e) =>
            setProp((p: ProductTitleBlockProps) => (p.titleSize = e.target.value as 'lg'))
          }
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">Extra Large</option>
        </select>
      </div>
    </div>
  );
}

// ─── Product Price ───────────────────────────────────────────────────────────

export interface ProductPriceBlockProps {
  showComparePrice?: boolean;
  showStock?: boolean;
  priceSize?: 'sm' | 'md' | 'lg';
}

export const ProductPriceBlock: UserComponent<ProductPriceBlockProps> = ({
  showComparePrice = true,
  showStock = true,
}) => {
  const {
    connectors: { connect },
  } = useNode();
  const product = usePreviewProduct();
  const price = product ? formatPrice(product.price, product.currency) : '€0.00';
  const hasDiscount = product?.compareAtPrice && product.compareAtPrice > product.price;
  const inStock = product ? product.inventoryQuantity > 0 || !product.trackInventory : true;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">{price}</span>
        {showComparePrice && hasDiscount && (
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(product!.compareAtPrice!, product!.currency)}
          </span>
        )}
      </div>
      {showStock && (
        <div className="mt-2">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Out of Stock
            </span>
          )}
        </div>
      )}
    </div>
  );
};

ProductPriceBlock.craft = {
  displayName: 'Product Price',
  props: { showComparePrice: true, showStock: true, priceSize: 'md' },
  related: { settings: ProductPriceSettings },
};

function ProductPriceSettings() {
  const {
    actions: { setProp },
    showComparePrice,
    showStock,
  } = useNode((node) => ({
    showComparePrice: node.data.props.showComparePrice,
    showStock: node.data.props.showStock,
  }));
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showComparePrice}
          onChange={(e) =>
            setProp((p: ProductPriceBlockProps) => (p.showComparePrice = e.target.checked))
          }
        />
        Show Compare Price
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showStock}
          onChange={(e) => setProp((p: ProductPriceBlockProps) => (p.showStock = e.target.checked))}
        />
        Show Stock Status
      </label>
    </div>
  );
}

// ─── Add to Cart ─────────────────────────────────────────────────────────────

export interface AddToCartBlockProps {
  showQuantity?: boolean;
  buttonStyle?: 'full' | 'compact';
  buttonText?: string;
}

export const AddToCartBlock: UserComponent<AddToCartBlockProps> = ({
  showQuantity = true,
  buttonStyle = 'full',
  buttonText = 'Add to Cart',
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="flex items-center gap-4"
    >
      {showQuantity && (
        <div className="flex items-center rounded-lg border">
          <button className="flex h-11 w-11 items-center justify-center text-gray-500" disabled>
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">1</span>
          <button className="flex h-11 w-11 items-center justify-center text-gray-500" disabled>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <button
        className={`flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white ${
          buttonStyle === 'full' ? 'flex-1' : ''
        }`}
        disabled
      >
        <ShoppingBag className="h-4 w-4" />
        {buttonText}
      </button>
    </div>
  );
};

AddToCartBlock.craft = {
  displayName: 'Add to Cart',
  props: { showQuantity: true, buttonStyle: 'full', buttonText: 'Add to Cart' },
  related: { settings: AddToCartSettings },
};

function AddToCartSettings() {
  const {
    actions: { setProp },
    showQuantity,
    buttonStyle,
    buttonText,
  } = useNode((node) => ({
    showQuantity: node.data.props.showQuantity,
    buttonStyle: node.data.props.buttonStyle,
    buttonText: node.data.props.buttonText,
  }));
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showQuantity}
          onChange={(e) => setProp((p: AddToCartBlockProps) => (p.showQuantity = e.target.checked))}
        />
        Show Quantity Selector
      </label>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Button Style</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={buttonStyle}
          onChange={(e) =>
            setProp((p: AddToCartBlockProps) => (p.buttonStyle = e.target.value as 'full'))
          }
        >
          <option value="full">Full Width</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Button Text</label>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={buttonText}
          onChange={(e) => setProp((p: AddToCartBlockProps) => (p.buttonText = e.target.value))}
        />
      </div>
    </div>
  );
}

// ─── Product Description ─────────────────────────────────────────────────────

export interface ProductDescriptionBlockProps {
  showHeading?: boolean;
  headingText?: string;
}

export const ProductDescriptionBlock: UserComponent<ProductDescriptionBlockProps> = ({
  showHeading = true,
  headingText = 'Description',
}) => {
  const {
    connectors: { connect },
  } = useNode();
  const product = usePreviewProduct();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="border-t pt-8"
    >
      {showHeading && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
          {headingText}
        </h2>
      )}
      <div className="mt-3 text-sm leading-relaxed text-gray-600">
        {product?.description ?? 'Product description will appear here.'}
      </div>
    </div>
  );
};

ProductDescriptionBlock.craft = {
  displayName: 'Product Description',
  props: { showHeading: true, headingText: 'Description' },
  related: { settings: ProductDescriptionSettings },
};

function ProductDescriptionSettings() {
  const {
    actions: { setProp },
    showHeading,
    headingText,
  } = useNode((node) => ({
    showHeading: node.data.props.showHeading,
    headingText: node.data.props.headingText,
  }));
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showHeading}
          onChange={(e) =>
            setProp((p: ProductDescriptionBlockProps) => (p.showHeading = e.target.checked))
          }
        />
        Show Heading
      </label>
      {showHeading && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Heading Text</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={headingText}
            onChange={(e) =>
              setProp((p: ProductDescriptionBlockProps) => (p.headingText = e.target.value))
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Product Reviews ─────────────────────────────────────────────────────────

export interface ProductReviewsBlockProps {
  showForm?: boolean;
  showRating?: boolean;
}

export const ProductReviewsBlock: UserComponent<ProductReviewsBlockProps> = ({
  showForm = true,
  showRating = true,
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="border-t pt-8 mt-10"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Reviews</h2>
      </div>
      {showRating && (
        <div className="mt-4 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
            />
          ))}
          <span className="ml-2 text-sm text-gray-500">4.0 (0 reviews)</span>
        </div>
      )}
      {showForm && (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">
          Review form will appear here
        </div>
      )}
    </div>
  );
};

ProductReviewsBlock.craft = {
  displayName: 'Product Reviews',
  props: { showForm: true, showRating: true },
};

// ─── Related Products ────────────────────────────────────────────────────────

export interface RelatedProductsBlockProps {
  columns?: 2 | 3 | 4;
  limit?: number;
  title?: string;
}

export const RelatedProductsBlock: UserComponent<RelatedProductsBlockProps> = ({
  columns = 4,
  title = 'Related Products',
}) => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="border-t pt-8"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-900">{title}</h2>
      <div className={`grid gap-6 grid-cols-2 lg:grid-cols-${columns}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="group">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <div className="flex h-full items-center justify-center text-gray-300">
                <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-2 h-4 w-24 rounded bg-gray-100" />
            <div className="mt-1 h-4 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
};

RelatedProductsBlock.craft = {
  displayName: 'Related Products',
  props: { columns: 4, limit: 4, title: 'Related Products' },
  related: { settings: RelatedProductsSettings },
};

function RelatedProductsSettings() {
  const {
    actions: { setProp },
    columns,
    limit,
    title,
  } = useNode((node) => ({
    columns: node.data.props.columns,
    limit: node.data.props.limit,
    title: node.data.props.title,
  }));
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setProp((p: RelatedProductsBlockProps) => (p.title = e.target.value))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Columns</label>
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={columns}
          onChange={(e) =>
            setProp((p: RelatedProductsBlockProps) => (p.columns = Number(e.target.value) as 2))
          }
        >
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Max Products</label>
        <input
          type="number"
          className="w-full rounded border px-2 py-1 text-sm"
          value={limit}
          min={1}
          max={12}
          onChange={(e) =>
            setProp((p: RelatedProductsBlockProps) => (p.limit = Number(e.target.value)))
          }
        />
      </div>
    </div>
  );
}

// ─── Product Short Description ───────────────────────────────────────────────

export const ProductShortDescBlock: UserComponent = () => {
  const {
    connectors: { connect },
  } = useNode();
  const product = usePreviewProduct();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
    >
      <p className="text-gray-600">{product?.shortDescription ?? 'Short product description'}</p>
    </div>
  );
};

ProductShortDescBlock.craft = {
  displayName: 'Short Description',
  props: {},
};
