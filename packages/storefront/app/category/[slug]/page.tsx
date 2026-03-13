import type { Metadata } from 'next';
import { getProducts, getCategoryBySlug } from '@/lib/api';
import type { Product } from '@forkcart/shared';
import { CategoryPageContent } from './category-content';

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
  const currentPage = page ? parseInt(page, 10) : 1;

  let categoryName = 'All Products';
  let categoryDescription: string | null = null;
  let categoryId: string | undefined;
  let categorySlug = slug;

  if (!isAll) {
    try {
      const category = await getCategoryBySlug(slug);
      categoryName = category.name;
      categoryDescription = category.description;
      categoryId = category.id;
      categorySlug = category.slug;
    } catch {
      categoryName = slug;
    }
  }

  let products: Product[] = [];
  let total = 0;
  let totalPages = 0;

  try {
    const res = await getProducts({
      categoryId,
      sortBy: sort ?? 'createdAt',
      sortDirection: order ?? 'desc',
      page: currentPage,
      limit: 24,
      status: 'active',
    });
    products = res.data;
    total = res.pagination.total;
    totalPages = res.pagination.totalPages;
  } catch {
    // API not available
  }

  return (
    <CategoryPageContent
      categoryName={categoryName}
      categoryDescription={categoryDescription}
      categorySlug={categorySlug}
      total={total}
      totalPages={totalPages}
      currentPage={currentPage}
      products={products}
    />
  );
}
