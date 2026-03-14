'use client';

import { LocaleLink } from '@/components/locale-link';
import { formatPrice } from '@forkcart/shared';
import type { Product } from '@forkcart/shared';
import { WishlistButton } from './wishlist-button';
import { StarRating } from './star-rating';

interface ProductWithImages extends Product {
  images?: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
}

interface ProductCardProps {
  product: ProductWithImages;
  averageRating?: number;
  reviewCount?: number;
}

export function ProductCard({ product, averageRating, reviewCount }: ProductCardProps) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const mainImage = product.images?.sort((a, b) => a.sortOrder - b.sortOrder)[0];

  return (
    <LocaleLink href={`/product/${product.slug}`} className="group relative block">
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={mainImage.alt ?? product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 transition group-hover:scale-105">
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
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} size="sm" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-accent transition">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{product.shortDescription}</p>
        )}
        {averageRating !== undefined && averageRating > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <StarRating rating={averageRating} size="sm" />
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="text-xs text-gray-400">({reviewCount})</span>
            )}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.compareAtPrice!, product.currency)}
            </span>
          )}
        </div>
      </div>
    </LocaleLink>
  );
}
