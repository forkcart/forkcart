'use client';

import { useState, useEffect } from 'react';
import { useTranslation, useLocale } from '@forkcart/i18n/react';
import { useCurrency } from '@/components/currency/currency-provider';
import { AddToCartButton } from './add-to-cart-button';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ProductReviews } from '@/components/product/product-reviews';
import { VariantPicker } from '@/components/product/variant-picker';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  inventoryQuantity: number;
  attributes: Record<string, string>;
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

export function ProductNotFound() {
  const { t } = useTranslation();
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{t('product.notFound')}</h1>
      <p className="mt-2 text-gray-500">{t('product.notFoundSubtext')}</p>
    </div>
  );
}

export function ProductContent({ product: initialProduct }: { product: ProductData }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const [product, setProduct] = useState(initialProduct);
  const [selectedImage, setSelectedImage] = useState(0);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  // Fetch localized product content when locale changes
  useEffect(() => {
    fetch(`${API_URL}/api/v1/products/${initialProduct.slug}?locale=${locale}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data: ProductData }>) : null))
      .then((data) => {
        if (data?.data)
          setProduct({
            ...initialProduct,
            ...data.data,
            images: data.data.images ?? initialProduct.images,
          });
      })
      .catch((error: unknown) => {
        console.error('[ProductContent] Failed to refresh product data:', error);
      });
  }, [locale, initialProduct.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch variants
  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/products/${initialProduct.id}/variants`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data: ProductVariant[] }>) : null))
      .then((data) => {
        if (data?.data) setVariants(data.data);
      })
      .catch((error: unknown) => {
        console.error('[ProductContent] Failed to fetch variants:', error);
      });
  }, [initialProduct.id]);

  // Compute effective price and stock based on variant selection
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveInventory = selectedVariant
    ? selectedVariant.inventoryQuantity
    : product.inventoryQuantity;
  const inStock = effectiveInventory > 0 || (!selectedVariant && !product.trackInventory);
  const hasVariants = variants.length > 0;
  // When product has variants, require a variant to be selected before adding to cart
  const canAddToCart = inStock && (!hasVariants || selectedVariant !== null);

  const images = product.images?.sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  return (
    <div className="container-page py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Images */}
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
          {images.length > 1 && (
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

        {/* Info */}
        <div className="flex flex-col">
          {product.sku && (
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {t('product.sku')}: {selectedVariant?.sku ?? product.sku}
            </p>
          )}
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
              {product.name}
            </h1>
            <WishlistButton productId={product.id} size="md" />
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(effectivePrice, product.currency)}
            </span>
            {hasDiscount && !selectedVariant && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compareAtPrice!, product.currency)}
              </span>
            )}
            {selectedVariant &&
              selectedVariant.price !== null &&
              selectedVariant.price !== product.price && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(product.price, product.currency)}
                </span>
              )}
          </div>

          <div className="mt-3">
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

          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          {/* Variant Picker */}
          {hasVariants && (
            <div className="mt-6">
              <VariantPicker
                variants={variants}
                productPrice={product.price}
                currency={product.currency}
                onVariantChange={setSelectedVariant}
              />
            </div>
          )}

          <div className="mt-8">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: effectivePrice,
              }}
              variantId={selectedVariant?.id}
              disabled={!canAddToCart}
            />
          </div>

          {product.description && (
            <div className="mt-10 border-t pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                {t('product.description')}
              </h2>
              <div
                className="mt-3 text-sm leading-relaxed text-gray-600 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-accent [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}

          <ProductReviews productId={product.id} />
        </div>
      </div>
    </div>
  );
}
