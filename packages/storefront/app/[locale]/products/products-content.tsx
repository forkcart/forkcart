'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation, useLocale } from '@forkcart/i18n/react';
import { ProductCard } from '@/components/product/product-card';
import { LocaleLink } from '@/components/locale-link';
import { getProducts } from '@/lib/api';
import type { Product } from '@forkcart/shared';
import type { CategoryWithCount } from '@/lib/api';

interface ProductsContentProps {
  products: Product[];
  categories: CategoryWithCount[];
  total: number;
  totalPages: number;
  currentPage: number;
  activeCategoryId: string | null;
  activeCategoryName: string | null;
  activeSort: string;
  activeMinPrice: string;
  activeMaxPrice: string;
}

/** Build pagination page numbers with ellipsis */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

export function ProductsContent({
  products,
  categories,
  total,
  totalPages,
  currentPage,
  activeCategoryId,
  activeCategoryName,
  activeSort,
  activeMinPrice,
  activeMaxPrice,
}: ProductsContentProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(activeMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(activeMaxPrice);
  const [localizedProducts, setLocalizedProducts] = useState(products);

  // Re-fetch products when locale changes (server-rendered with default locale)
  useEffect(() => {
    let cancelled = false;
    getProducts({
      page: currentPage,
      limit: 24,
      categoryId: activeCategoryId ?? undefined,
      sortBy:
        activeSort === 'price-asc' || activeSort === 'price-desc'
          ? 'price'
          : activeSort === 'name-asc'
            ? 'name'
            : 'createdAt',
      sortDirection: activeSort === 'price-asc' || activeSort === 'name-asc' ? 'asc' : 'desc',
      minPrice: activeMinPrice ? parseInt(activeMinPrice, 10) : undefined,
      maxPrice: activeMaxPrice ? parseInt(activeMaxPrice, 10) : undefined,
      status: 'active',
    })
      .then((res) => {
        if (!cancelled) setLocalizedProducts(res.data);
      })
      .catch(() => {
        // Keep server-rendered products as fallback
      });
    return () => {
      cancelled = true;
    };
  }, [locale, currentPage, activeCategoryId, activeSort, activeMinPrice, activeMaxPrice]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handlePriceApply() {
    updateParams({ minPrice: minPriceInput, maxPrice: maxPriceInput, page: '' });
  }

  function buildPageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `/products?${params.toString()}`;
  }

  const breadcrumbLabel = activeCategoryName ?? t('nav.products');

  const sidebar = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          {t('product.categories')}
        </h3>
        <ul className="space-y-1">
          <li>
            <LocaleLink
              href="/products"
              className={`block rounded-md px-3 py-2 text-sm transition ${
                !activeCategoryId ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('common.all')} (
              {total > 0 ? categories.reduce((s, c) => s + c.productCount, 0) : 0})
            </LocaleLink>
          </li>
          {categories
            .filter((c) => c.productCount > 0)
            .map((cat) => (
              <li key={cat.id}>
                <LocaleLink
                  href={`/products?category=${cat.id}`}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    activeCategoryId === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat.name} ({cat.productCount})
                </LocaleLink>
              </li>
            ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          {t('search.filters.priceRange')}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={t('search.filters.min')}
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder={t('search.filters.max')}
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button
          type="button"
          onClick={handlePriceApply}
          className="mt-2 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          {t('search.filters.apply')}
        </button>
      </div>

      {/* Sort */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          {t('search.filters.sortBy')}
        </h3>
        <select
          value={activeSort}
          onChange={(e) => updateParams({ sort: e.target.value, page: '' })}
          className="h-9 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="newest">{t('category.sort.newest')}</option>
          <option value="price-asc">{t('category.sort.priceLowHigh')}</option>
          <option value="price-desc">{t('category.sort.priceHighLow')}</option>
          <option value="name-asc">{t('category.sort.nameAZ')}</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <LocaleLink href="/" className="hover:text-gray-900 transition">
          {t('nav.home')}
        </LocaleLink>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{breadcrumbLabel}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {activeCategoryName ?? t('nav.products')}
        </h1>
        <p className="text-sm text-gray-500">{t('category.productCount', { count: total })}</p>
      </div>

      {/* Mobile filter toggle */}
      <button
        type="button"
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        className="mb-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm lg:hidden"
      >
        {showMobileFilters ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
        {showMobileFilters ? t('common.close') : t('search.filters.sortBy')}
      </button>

      <div className="flex gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden w-56 shrink-0 lg:block">{sidebar}</aside>

        {/* Mobile sidebar */}
        {showMobileFilters && (
          <aside className="mb-6 w-full rounded-lg border bg-white p-4 lg:hidden">{sidebar}</aside>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {localizedProducts.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {localizedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-400">{t('category.noProducts')}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1">
              <LocaleLink
                href={currentPage > 1 ? buildPageUrl(currentPage - 1) : '#'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition hover:bg-gray-100 ${
                  currentPage <= 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </LocaleLink>

              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1 text-sm text-gray-400">
                    …
                  </span>
                ) : (
                  <LocaleLink
                    key={p}
                    href={buildPageUrl(p)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition ${
                      p === currentPage ? 'bg-gray-900 text-white' : 'border hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </LocaleLink>
                ),
              )}

              <LocaleLink
                href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : '#'}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition hover:bg-gray-100 ${
                  currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </LocaleLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
