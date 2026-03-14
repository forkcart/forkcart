'use client';

import { useTranslation } from '@forkcart/i18n/react';
import { ProductCard } from '@/components/product/product-card';
import { SearchInput } from './search-input';
import { SearchFilters } from './search-filters';
import { Search } from 'lucide-react';
import { LocaleLink } from '@/components/locale-link';

interface SearchContentProps {
  q?: string;
  products: Array<Record<string, unknown>>;
  total: number;
  searchMode: string;
  suggestions?: string[];
  popularSearches: Array<{ query: string; searchCount: number }>;
  allCategories: Array<{ id: string; name: string; slug: string }>;
  category?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
}

export function SearchContent({
  q,
  products,
  total,
  searchMode,
  suggestions,
  popularSearches,
  allCategories,
  category,
  priceMin,
  priceMax,
  sort,
}: SearchContentProps) {
  const { t } = useTranslation();

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('search.title')}</h1>

      <div className="mt-6">
        <SearchInput defaultValue={q ?? ''} />
      </div>

      {q && (
        <div className="mt-4 flex items-center gap-2">
          <p className="text-sm text-gray-500">
            {t('search.resultsCount', { count: total, query: q })}
          </p>
          {searchMode === 'enhanced' && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {t('search.aiEnhanced')}
            </span>
          )}
        </div>
      )}

      {/* No query — show search prompt */}
      {!q && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">{t('search.typeToSearch')}</p>
          {popularSearches.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700">{t('search.popularSearches')}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {popularSearches.map((s) => (
                  <LocaleLink
                    key={s.query}
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="rounded-full border px-3 py-1 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                  >
                    {s.query}
                  </LocaleLink>
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
          <p className="text-gray-400">{t('search.noResults', { query: q })}</p>

          {suggestions && suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">{t('search.didYouMean')}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <LocaleLink
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-sm text-accent transition hover:bg-accent/10"
                  >
                    {s}
                  </LocaleLink>
                ))}
              </div>
            </div>
          )}

          {popularSearches.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-600">{t('search.popularSearches')}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {popularSearches.map((s) => (
                  <LocaleLink
                    key={s.query}
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="rounded-full border px-3 py-1 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                  >
                    {s.query}
                  </LocaleLink>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
