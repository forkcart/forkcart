'use client';

import { Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@forkcart/i18n/react';
import { ProductCard } from '@/components/product/product-card';
import { LocaleLink } from '@/components/locale-link';
import { SortFilter } from './sort-filter';
import type { Product } from '@forkcart/shared';

interface CategoryPageContentProps {
  categoryName: string;
  categoryDescription: string | null;
  categorySlug: string;
  total: number;
  totalPages: number;
  currentPage: number;
  products: Product[];
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

export function CategoryPageContent({
  categoryName,
  categoryDescription,
  categorySlug,
  total,
  totalPages,
  currentPage,
  products,
}: CategoryPageContentProps) {
  const { t } = useTranslation();

  function buildPageUrl(p: number) {
    return `/category/${categorySlug}?page=${p}`;
  }

  return (
    <div className="container-page py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <LocaleLink href="/" className="hover:text-gray-900 transition">
          {t('nav.home')}
        </LocaleLink>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{categoryName}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{categoryName}</h1>
        {categoryDescription && <p className="mt-2 text-gray-500">{categoryDescription}</p>}
        <p className="mt-1 text-sm text-gray-400">{t('category.productCount', { count: total })}</p>
      </div>

      <Suspense fallback={<div className="h-9" />}>
        <SortFilter />
      </Suspense>

      {products.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
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
  );
}
