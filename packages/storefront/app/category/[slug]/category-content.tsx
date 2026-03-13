'use client';

import { Suspense } from 'react';
import { useTranslation } from '@forkcart/i18n/react';
import { ProductCard } from '@/components/product/product-card';
import { SortFilter } from './sort-filter';

interface CategoryContentProps {
  categoryName: string;
  categoryDescription: string | null;
  total: number;
  products: any[];
}

export function CategoryContent({
  categoryName,
  categoryDescription,
  total,
  products,
}: CategoryContentProps) {
  const { t } = useTranslation();

  return (
    <div className="container-page py-12">
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
    </div>
  );
}
