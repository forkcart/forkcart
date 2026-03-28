import type { Metadata } from 'next';
import { getProducts, getCategoryBySlug } from '@/lib/api';
import type { Product } from '@forkcart/shared';
import { CategoryPageContent } from './category-content';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

const BASE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sort?: string; order?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'all') {
    return {
      title: 'All Products',
      alternates: { canonical: `${BASE_URL}/category/all` },
    };
  }
  try {
    const category = await getCategoryBySlug(slug);
    return {
      title: category.name,
      description: category.description ?? undefined,
      alternates: { canonical: `${BASE_URL}/category/${slug}` },
    };
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
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.FORKCART = window.FORKCART || {}; window.FORKCART.pageType = "category"; window.FORKCART.categorySlug = "${categorySlug}";${categoryId ? ` window.FORKCART.categoryId = "${categoryId}";` : ''}`,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: categoryName, url: `/category/${categorySlug}` },
        ]}
      />
      <CategoryPageContent
        categoryName={categoryName}
        categoryDescription={categoryDescription}
        categorySlug={categorySlug}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        products={products}
      />
    </>
  );
}
