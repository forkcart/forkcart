import type { Metadata } from 'next';
import { getProducts, getCategoriesWithCounts } from '@/lib/api';
import type { CategoryWithCount } from '@/lib/api';
import type { Product } from '@forkcart/shared';
import { ProductsContent } from './products-content';

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Browse our complete product catalog',
};

interface Props {
  searchParams: Promise<{
    page?: string;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const { page, category, sort, minPrice, maxPrice } = await searchParams;

  const currentPage = page ? parseInt(page, 10) : 1;

  // Parse sort param
  let sortBy = 'createdAt';
  let sortDirection = 'desc';
  if (sort === 'price-asc') {
    sortBy = 'price';
    sortDirection = 'asc';
  } else if (sort === 'price-desc') {
    sortBy = 'price';
    sortDirection = 'desc';
  } else if (sort === 'name-asc') {
    sortBy = 'name';
    sortDirection = 'asc';
  } else if (sort === 'newest') {
    sortBy = 'createdAt';
    sortDirection = 'desc';
  }

  let products: Product[] = [];
  let total = 0;
  let totalPages = 0;
  let categories: CategoryWithCount[] = [];
  let activeCategoryName: string | null = null;

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      getProducts({
        page: currentPage,
        limit: 24,
        categoryId: category,
        sortBy,
        sortDirection,
        minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
        status: 'active',
      }),
      getCategoriesWithCounts(),
    ]);

    products = productsRes.data;
    total = productsRes.pagination.total;
    totalPages = productsRes.pagination.totalPages;
    categories = categoriesRes;

    if (category) {
      const found = categoriesRes.find((c) => c.id === category);
      if (found) activeCategoryName = found.name;
    }
  } catch {
    // API not available
  }

  return (
    <ProductsContent
      products={products}
      categories={categories}
      total={total}
      totalPages={totalPages}
      currentPage={currentPage}
      activeCategoryId={category ?? null}
      activeCategoryName={activeCategoryName}
      activeSort={sort ?? 'newest'}
      activeMinPrice={minPrice ?? ''}
      activeMaxPrice={maxPrice ?? ''}
    />
  );
}
