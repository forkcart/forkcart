import type { Metadata } from 'next';
import { searchProducts, getPopularSearches, getCategories } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { SearchInput } from './search-input';
import { SearchFilters } from './search-filters';
import { Search } from 'lucide-react';
import Link from 'next/link';

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

  // Get popular searches for empty/no-results state
  let popularSearches: Array<{ query: string; searchCount: number }> = [];
  if (!q || products.length === 0) {
    try {
      const popular = await getPopularSearches();
      popularSearches = popular.data;
    } catch {
      // Ignore
    }
  }

  // Get categories for filter sidebar
  let allCategories: Array<{ id: string; name: string; slug: string }> = [];
  try {
    allCategories = await getCategories();
  } catch {
    // Ignore
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Search</h1>

      <div className="mt-6">
        <SearchInput defaultValue={q ?? ''} />
      </div>

      {q && (
        <div className="mt-4 flex items-center gap-2">
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? 's' : ''} for &quot;{q}&quot;
          </p>
          {searchMode === 'enhanced' && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              AI-enhanced
            </span>
          )}
        </div>
      )}

      {/* No query — show search prompt */}
      {!q && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Type something to search our products.</p>
          {popularSearches.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700">Popular searches</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {popularSearches.map((s) => (
                  <Link
                    key={s.query}
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="rounded-full border px-3 py-1 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                  >
                    {s.query}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results with filter sidebar */}
      {q && products.length > 0 && (
        <div className="mt-8 flex gap-8">
          <SearchFilters
            categories={allCategories}
            currentCategory={category}
            currentPriceMin={priceMin}
            currentPriceMax={priceMax}
            currentSort={sort}
            query={q}
          />

          <div className="flex-1">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product['id'] as string} product={product as never} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No results */}
      {q && products.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400">No products found for &quot;{q}&quot;.</p>

          {suggestions && suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">Did you mean?</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <Link
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-sm text-accent transition hover:bg-accent/10"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {popularSearches.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-600">Popular searches</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {popularSearches.map((s) => (
                  <Link
                    key={s.query}
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="rounded-full border px-3 py-1 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                  >
                    {s.query}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
