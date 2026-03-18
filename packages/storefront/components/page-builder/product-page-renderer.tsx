'use client';

import { PageRenderer } from './renderer';
import { useTranslation } from '@forkcart/i18n/react';
import { useCurrency } from '@/components/currency/currency-provider';
import { AddToCartButton } from '@/app/[locale]/product/[slug]/add-to-cart-button';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ProductReviews } from '@/components/product/product-reviews';
import { useState, useEffect } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  sku?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  images?: ProductImage[];
}

interface ProductPageRendererProps {
  content: unknown;
  product: ProductData;
  locale?: string;
}

/**
 * Renders a Page Builder product page with real product data
 * injected into dynamic block slots. Re-fetches product with
 * the active locale so translations are applied.
 */
export function ProductPageRenderer({ content, product, locale }: ProductPageRendererProps) {
  if (!content || typeof content !== 'object') {
    return null;
  }

  return (
    <LocalizedProductProvider initialProduct={product}>
      <PageRenderer content={content} locale={locale} />
    </LocalizedProductProvider>
  );
}

// ─── Product data context ────────────────────────────────────────────────────

import { createContext, useContext } from 'react';
import { useLocale } from '@forkcart/i18n/react';

const ProductContext = createContext<ProductData | null>(null);

/**
 * Wraps children with product data context.
 * Re-fetches product with current locale so translated name/description are used.
 */
function LocalizedProductProvider({
  initialProduct,
  children,
}: {
  initialProduct: ProductData;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const [product, setProduct] = useState<ProductData>(initialProduct);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/products/${initialProduct.slug}?locale=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { data?: ProductData } | null) => {
        if (d?.data) setProduct(d.data);
      })
      .catch(() => {});
  }, [locale, initialProduct.slug]);

  return <ProductContext.Provider value={product}>{children}</ProductContext.Provider>;
}

export function useProductData() {
  return useContext(ProductContext);
}

// ─── Dynamic block components (used by storefront renderer) ──────────────────

export function RenderProductImages({ layout = 'gallery' }: { layout?: string }) {
  const product = useProductData();
  const [selectedImage, setSelectedImage] = useState(0);
  if (!product) return null;
  const images = product.images?.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
        {images.length > 0 ? (
          <img
            src={images[selectedImage]?.url}
            alt={images[selectedImage]?.alt ?? product.name}
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
      {images.length > 1 && layout !== 'single' && (
        <div className="mt-4 flex gap-3">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedImage(idx)}
              className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition ${
                idx === selectedImage
                  ? 'border-gray-900'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt ?? `${product.name} ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RenderProductTitle({
  showSku = true,
  showWishlist = true,
  titleSize = 'lg',
}: {
  showSku?: boolean;
  showWishlist?: boolean;
  titleSize?: string;
}) {
  const product = useProductData();
  const { t } = useTranslation();
  if (!product) return null;
  const sizeClass =
    { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' }[titleSize] ?? 'text-3xl';

  return (
    <div>
      {showSku && product.sku && (
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {t('product.sku')}: {product.sku}
        </p>
      )}
      <div className="mt-2 flex items-start justify-between gap-4">
        <h1 className={`font-bold tracking-tight text-gray-900 ${sizeClass}`}>{product.name}</h1>
        {showWishlist && <WishlistButton productId={product.id} size="md" />}
      </div>
    </div>
  );
}

export function RenderProductPrice({
  showComparePrice = true,
  showStock = true,
}: {
  showComparePrice?: boolean;
  showStock?: boolean;
}) {
  const product = useProductData();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  if (!product) return null;
  const inStock = product.inventoryQuantity > 0 || !product.trackInventory;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-900">
          {formatPrice(product.price, product.currency ?? 'EUR')}
        </span>
        {showComparePrice && hasDiscount && (
          <span className="text-lg text-gray-400 line-through">
            {formatPrice(product.compareAtPrice!, product.currency ?? 'EUR')}
          </span>
        )}
      </div>
      {showStock && (
        <div className="mt-2">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {t('product.inStock')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              {t('product.outOfStock')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function RenderAddToCart() {
  const product = useProductData();
  if (!product) return null;
  const inStock = product.inventoryQuantity > 0 || !product.trackInventory;

  return (
    <AddToCartButton
      product={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
      }}
      disabled={!inStock}
    />
  );
}

export function RenderProductDescription({
  showHeading = true,
  headingText = 'Description',
}: {
  showHeading?: boolean;
  headingText?: string;
}) {
  const product = useProductData();
  const { t } = useTranslation();
  if (!product?.description) return null;

  return (
    <div className="border-t pt-8">
      {showHeading && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
          {headingText || t('product.description')}
        </h2>
      )}
      <div
        className="mt-3 text-sm leading-relaxed text-gray-600 [&_a]:text-accent [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
      />
    </div>
  );
}

export function RenderProductShortDesc() {
  const product = useProductData();
  if (!product?.shortDescription) return null;
  return <p className="text-gray-600">{product.shortDescription}</p>;
}

export function RenderProductReviews() {
  const product = useProductData();
  if (!product) return null;
  return <ProductReviews productId={product.id} />;
}

export function RenderRelatedProducts({
  columns = 4,
  limit = 4,
  title = 'Related Products',
}: {
  columns?: number;
  limit?: number;
  title?: string;
}) {
  const product = useProductData();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<ProductData[]>([]);

  useEffect(() => {
    if (!product) return;
    fetch(`${API_URL}/api/v1/products?limit=${limit}&status=active`)
      .then((r) => r.json())
      .then((d: { data?: ProductData[] }) => {
        const filtered = (d.data ?? []).filter((p) => p.id !== product.id).slice(0, limit);
        setProducts(filtered);
      })
      .catch(() => {});
  }, [product, limit]);

  if (!product || products.length === 0) return null;

  return (
    <div className="border-t pt-8">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">{title}</h2>
      <div className={`grid gap-6 grid-cols-2 lg:grid-cols-${columns}`}>
        {products.map((p) => (
          <a key={p.id} href={`/product/${p.slug}`} className="group">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              {p.images?.[0] ? (
                <img
                  src={p.images[0].url}
                  alt={p.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
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
              )}
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{p.name}</h3>
            <p className="text-sm font-semibold text-gray-900">
              {formatPrice(p.price, p.currency ?? 'EUR')}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
