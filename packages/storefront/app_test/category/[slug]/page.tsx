import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProducts, getCategories, getCategoryBySlug } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { SortFilter } from './sort-filter';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; order?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'all') return { title: 'All Products' };
  try {
    const category = await getCategoryBySlug(slug);
    return { title: category.name, description: category.description ?? undefined };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort, order, page } = await searchParams;
  const isAll = slug === 'all';

  let categoryName = 'All Products';
  let categoryDescription: string | null = null;
  let categoryId: string | undefined;

  if (!isAll) {
    try {
      const category = await getCategoryBySlug(slug);
      categoryName = category.name;
      categoryDescription = category.description;
      categoryId = category.id;
    } catch {
      categoryName = slug;
    }
  }

  let products = [];
  let total = 0;

  try {
    const res = await getProducts({
      categoryId,
      sortBy: sort ?? 'createdAt',
      sortDirection: order ?? 'desc',
      page: page ? parseInt(page, 10) : 1,
      limit: 12,
    });
    products = res.data;
    total = res.pagination.total;
  } catch {
    // API not available
  }

  return (
    <div className="container-page py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{categoryName}</h1>
        {categoryDescription && <p className="mt-2 text-gray-500">{categoryDescription}</p>}
        <p className="mt-1 text-sm text-gray-400">
          {total} product{total !== 1 ? 's' : ''}
        </p>
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
          <p className="text-gray-400">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
