import type { Metadata } from 'next';
import { getProducts, getCategoryBySlug } from '@/lib/api';
import { CategoryContent } from './category-content';

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

  let products: any[] = [];
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
    <CategoryContent
      categoryName={categoryName}
      categoryDescription={categoryDescription}
      total={total}
      products={products}
    />
  );
}
