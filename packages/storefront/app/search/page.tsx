import type { Metadata } from 'next';
import { searchProducts, getPopularSearches, getCategories } from '@/lib/api';
import { SearchContent } from './search-content';

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    priceMin?: string;
    priceMax?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : 'Search',
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const { q, category, priceMin, priceMax, sort } = params;

  let products: Array<Record<string, unknown>> = [];
  let total = 0;
  let suggestions: string[] | undefined;
  let searchMode = 'basic';

  if (q) {
    try {
      const res = await searchProducts(q, {
        category,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        sort: sort as
          | 'relevance'
          | 'price_asc'
          | 'price_desc'
          | 'name_asc'
          | 'name_desc'
          | 'newest'
          | undefined,
        limit: 24,
      });
      products = res.data as Array<Record<string, unknown>>;
      total = res.pagination.total;
      suggestions = res.meta?.suggestions;
      searchMode = res.meta?.mode ?? 'basic';
    } catch {
      // API not available — show empty state
    }
  }

  let popularSearches: Array<{ query: string; searchCount: number }> = [];
  if (!q || products.length === 0) {
    try {
      const popular = await getPopularSearches();
      popularSearches = popular.data;
    } catch {
      // Ignore
    }
  }

  let allCategories: Array<{ id: string; name: string; slug: string }> = [];
  try {
    allCategories = await getCategories();
  } catch {
    // Ignore
  }

  return (
    <SearchContent
      q={q}
      products={products}
      total={total}
      searchMode={searchMode}
      suggestions={suggestions}
      popularSearches={popularSearches}
      allCategories={allCategories}
      category={category}
      priceMin={priceMin}
      priceMax={priceMax}
      sort={sort}
    />
  );
}
