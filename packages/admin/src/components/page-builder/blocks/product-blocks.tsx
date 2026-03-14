'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import {
  ImageIcon,
  Type,
  DollarSign,
  ShoppingBag,
  FileText,
  Star,
  Package,
  Tag,
} from 'lucide-react';

// ─── Shared placeholder wrapper ──────────────────────────────────────────────

function DynamicPlaceholder({
  icon: Icon,
  label,
  color,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  description: string;
  children?: React.ReactNode;
}) {
  const {
    connectors: { connect },
  } = useNode();

  const colors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    blue: {
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      badge: 'bg-blue-200 text-blue-700',
    },
    green: {
      border: 'border-green-300',
      bg: 'bg-green-50',
      text: 'text-green-700',
      badge: 'bg-green-200 text-green-700',
    },
    purple: {
      border: 'border-purple-300',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      badge: 'bg-purple-200 text-purple-700',
    },
    amber: {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'bg-amber-200 text-amber-700',
    },
    cyan: {
      border: 'border-cyan-300',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      badge: 'bg-cyan-200 text-cyan-700',
    },
    rose: {
      border: 'border-rose-300',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      badge: 'bg-rose-200 text-rose-700',
    },
    indigo: {
      border: 'border-indigo-300',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      badge: 'bg-indigo-200 text-indigo-700',
    },
    gray: {
      border: 'border-gray-300',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      badge: 'bg-gray-200 text-gray-700',
    },
  };

  const c = colors[color] ?? colors.blue!;

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className={`rounded-lg border-2 border-dashed ${c.border} ${c.bg} p-4`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${c.text}`} />
        <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.badge}`}>Dynamic</span>
      </div>
      <p className={`mt-1 text-xs ${c.text} opacity-75`}>{description}</p>
      {children}
    </div>
  );
}

// ─── Product Images ──────────────────────────────────────────────────────────

export interface ProductImagesBlockProps {
  layout?: 'grid' | 'gallery' | 'single';
  thumbnailPosition?: 'bottom' | 'left';
  aspectRatio?: 'square' | '4:3' | '3:4';
}

export const ProductImagesBlock: UserComponent<ProductImagesBlockProps> = ({
  layout = 'gallery',
  aspectRatio = 'square',
}) => (
  <DynamicPlaceholder
    icon={ImageIcon}
    label="Product Images"
    color="blue"
    description={`${layout} layout · ${aspectRatio} ratio — Shows product image gallery with thumbnails`}
  >
    <div className="mt-2 grid grid-cols-4 gap-1">
      <div className="col-span-3 aspect-square rounded bg-blue-100" />
      <div className="flex flex-col gap-1">
        <div className="aspect-square rounded bg-blue-100" />
        <div className="aspect-square rounded bg-blue-100" />
        <div className="aspect-square rounded bg-blue-100" />
      </div>
    </div>
  </DynamicPlaceholder>
);

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
  const sizeClass = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' }[titleSize];
  return (
    <DynamicPlaceholder
      icon={Type}
      label="Product Title"
      color="indigo"
      description="Shows product name, SKU, and wishlist button"
    >
      <div className="mt-2">
        {showSku && <div className="h-3 w-16 rounded bg-indigo-100" />}
        <div className={`mt-1 h-6 w-48 rounded bg-indigo-200 ${sizeClass}`} />
        {showWishlist && (
          <span className="mt-1 inline-block text-[10px] text-indigo-400">♥ Wishlist</span>
        )}
      </div>
    </DynamicPlaceholder>
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
}) => (
  <DynamicPlaceholder
    icon={DollarSign}
    label="Product Price"
    color="green"
    description="Shows price, compare-at price, and stock status"
  >
    <div className="mt-2 flex items-baseline gap-2">
      <div className="h-5 w-20 rounded bg-green-200" />
      {showComparePrice && <div className="h-3 w-14 rounded bg-green-100 line-through" />}
    </div>
    {showStock && <div className="mt-1 h-3 w-12 rounded bg-green-100" />}
  </DynamicPlaceholder>
);

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
}) => (
  <DynamicPlaceholder
    icon={ShoppingBag}
    label="Add to Cart"
    color="amber"
    description="Quantity selector and Add to Cart button"
  >
    <div className="mt-2 flex items-center gap-2">
      {showQuantity && <div className="h-8 w-24 rounded border border-amber-200 bg-white" />}
      <div className={`h-8 rounded bg-amber-300 ${buttonStyle === 'full' ? 'flex-1' : 'px-6'}`}>
        <span className="flex h-full items-center justify-center text-xs font-medium text-amber-900">
          {buttonText}
        </span>
      </div>
    </div>
  </DynamicPlaceholder>
);

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
}) => (
  <DynamicPlaceholder
    icon={FileText}
    label="Product Description"
    color="gray"
    description="Shows the full product description"
  >
    <div className="mt-2">
      {showHeading && <div className="h-3 w-20 rounded bg-gray-200 font-bold">{headingText}</div>}
      <div className="mt-1 space-y-1">
        <div className="h-2 w-full rounded bg-gray-100" />
        <div className="h-2 w-5/6 rounded bg-gray-100" />
        <div className="h-2 w-3/4 rounded bg-gray-100" />
      </div>
    </div>
  </DynamicPlaceholder>
);

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
}) => (
  <DynamicPlaceholder
    icon={Star}
    label="Product Reviews"
    color="rose"
    description="Customer reviews and rating form"
  >
    <div className="mt-2 flex items-center gap-1">
      {showRating && (
        <>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-3 w-3 fill-rose-300 text-rose-300" />
          ))}
          <span className="ml-1 text-[10px] text-rose-400">4.5 (12 reviews)</span>
        </>
      )}
    </div>
    {showForm && <div className="mt-1 text-[10px] text-rose-400">+ Write a review form</div>}
  </DynamicPlaceholder>
);

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
  limit = 4,
  title = 'Related Products',
}) => (
  <DynamicPlaceholder
    icon={Package}
    label="Related Products"
    color="cyan"
    description={`${limit} products in ${columns} columns`}
  >
    <div className="mt-2">
      <div className="text-[10px] font-medium text-cyan-600">{title}</div>
      <div className={`mt-1 grid grid-cols-${columns} gap-1`}>
        {Array.from({ length: Math.min(limit, columns) }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-cyan-100" />
        ))}
      </div>
    </div>
  </DynamicPlaceholder>
);

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
        <label className="mb-1 block text-xs font-medium text-gray-600">Limit</label>
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

export const ProductShortDescBlock: UserComponent = () => (
  <DynamicPlaceholder
    icon={Tag}
    label="Short Description"
    color="purple"
    description="Shows the product's short description / tagline"
  >
    <div className="mt-1 h-2 w-3/4 rounded bg-purple-100" />
  </DynamicPlaceholder>
);

ProductShortDescBlock.craft = {
  displayName: 'Short Description',
  props: {},
};
