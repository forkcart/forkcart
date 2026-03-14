'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@forkcart/shared';
import { useAuth } from '@/components/auth/auth-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { WishlistButton } from '@/components/product/wishlist-button';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  images?: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
}

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: WishlistProduct;
}

export default function WishlistPage() {
  const { t } = useTranslation();
  const { token, customer, isLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/v1/public/wishlists`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ data: WishlistItem[] }>) : null))
      .then((data) => {
        if (data?.data) setItems(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (isLoading || loading) {
    return (
      <div className="container-page py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('wishlist.title')}</h1>
        <p className="mt-2 text-gray-500">{t('wishlist.loginRequired')}</p>
        <Link
          href="/account/login"
          className="mt-4 inline-block rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('nav.login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-2xl font-bold text-gray-900">{t('wishlist.title')}</h1>

      {items.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-gray-500">{t('wishlist.empty')}</p>
          <Link
            href="/category/all"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            {t('wishlist.browseProducts')}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const product = item.product;
            const mainImage = product.images?.sort((a, b) => a.sortOrder - b.sortOrder)[0];
            const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

            return (
              <div key={item.id} className="group relative">
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {mainImage ? (
                      <img
                        src={mainImage.url}
                        alt={mainImage.alt ?? product.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg
                          className="h-16 w-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
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
                </Link>
                <div className="absolute top-2 right-2">
                  <WishlistButton productId={product.id} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
