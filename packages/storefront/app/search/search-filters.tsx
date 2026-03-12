'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  categories: Category[];
  currentCategory?: string;
  currentPriceMin?: string;
  currentPriceMax?: string;
  currentSort?: string;
  query: string;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
  { value: 'name_desc', label: 'Name: Z → A' },
  { value: 'newest', label: 'Newest first' },
] as const;

export function SearchFilters({
  categories,
  currentCategory,
  currentPriceMin,
  currentPriceMax,
  currentSort,
  query,
}: Props) {
  const router = useRouter();
  const [priceMin, setPriceMin] = useState(currentPriceMin ?? '');
  const [priceMax, setPriceMax] = useState(currentPriceMax ?? '');

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams({ q: query });
    const current = {
      category: currentCategory,
      priceMin: currentPriceMin,
      priceMax: currentPriceMax,
      sort: currentSort,
    };
    const merged = { ...current, ...overrides };

    if (merged.category) params.set('category', merged.category);
    if (merged.priceMin) params.set('priceMin', merged.priceMin);
    if (merged.priceMax) params.set('priceMax', merged.priceMax);
    if (merged.sort && merged.sort !== 'relevance') params.set('sort', merged.sort);

    return `/search?${params.toString()}`;
  }

  function handlePriceFilter() {
    router.push(
      buildUrl({
        priceMin: priceMin || undefined,
        priceMax: priceMax || undefined,
      }),
    );
  }

  return (
    <aside className="hidden w-56 shrink-0 space-y-6 lg:block">
      {/* Sort */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Sort by</h3>
        <select
          value={currentSort ?? 'relevance'}
          onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Category</h3>
          <ul className="mt-2 space-y-1">
            <li>
              <button
                onClick={() => router.push(buildUrl({ category: undefined }))}
                className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                  !currentCategory
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All categories
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => router.push(buildUrl({ category: cat.id }))}
                  className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                    currentCategory === cat.id
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Price range</h3>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-20 rounded-md border px-2 py-1.5 text-sm"
            min={0}
          />
          <span className="self-center text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-20 rounded-md border px-2 py-1.5 text-sm"
            min={0}
          />
        </div>
        <button
          onClick={handlePriceFilter}
          className="mt-2 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
        >
          Apply
        </button>
      </div>
    </aside>
  );
}
