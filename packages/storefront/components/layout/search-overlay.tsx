'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react';
import { useTranslation } from '@forkcart/i18n/react';
import { formatPrice } from '@forkcart/shared';
import {
  instantSearch,
  getPublicPopularSearches,
  getTrendingProducts,
  trackImpression,
} from '@/lib/api';
import type { InstantSearchItem, TrendingProductItem } from '@/lib/api';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstantSearchItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popularSearches, setPopularSearches] = useState<
    Array<{ query: string; searchCount: number }>
  >([]);
  const [trending, setTrending] = useState<TrendingProductItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Load popular + trending when overlay opens
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 50);

    Promise.all([getPublicPopularSearches(), getTrendingProducts()])
      .then(([pop, trend]) => {
        setPopularSearches(pop.data);
        setTrending(trend.data);
      })
      .catch((error: unknown) => {
        // Intentionally silent: search overlay still works without popular/trending data
        console.error(
          '[SearchOverlay] Failed to load popular searches or trending products:',
          error,
        );
      });

    return () => clearTimeout(timer);
  }, [open]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setTotalResults(0);
      setActiveIndex(-1);
    }
  }, [open]);

  // Debounced instant search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setTotalResults(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await instantSearch(q.trim());
      setResults(res.data);
      setTotalResults(res.data.length);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 200);
  }

  function navigateToSearch(q: string) {
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      onClose();
    }
  }

  function navigateToProduct(slug: string, productId: string) {
    trackImpression({ productId, eventType: 'click', query: query.trim() || undefined });
    router.push(`/product/${slug}`);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const itemCount = results.length + (query.trim() ? 1 : 0); // +1 for "view all" link

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        const product = results[activeIndex];
        if (product) navigateToProduct(product.slug, product.id);
      } else {
        navigateToSearch(query);
      }
    }
  }

  // Close on Escape globally
  useEffect(() => {
    if (!open) return;
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [open, onClose]);

  if (!open) return null;

  const showInitialState = !query.trim();
  const showResults = !showInitialState && results.length > 0;
  const showNoResults = !showInitialState && !loading && results.length === 0 && query.length >= 2;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Overlay Content */}
      <div className="relative mx-auto mt-0 w-full max-w-3xl animate-search-slide-down px-4 pt-[10vh] md:pt-[15vh]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          {/* Search Input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search.searchProducts')}
              className="h-14 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-gray-400"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setTotalResults(0);
                  inputRef.current?.focus();
                }}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-2 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition hover:text-gray-600"
            >
              ESC
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              </div>
            )}

            {/* Initial state: Popular + Trending */}
            {showInitialState && !loading && (
              <div className="p-5">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Popular Searches */}
                  {popularSearches.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {t('search.popularSearches')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((s) => (
                          <button
                            key={s.query}
                            onClick={() => {
                              setQuery(s.query);
                              doSearch(s.query);
                            }}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                          >
                            {s.query}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Products */}
                  {trending.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t('search.trendingProducts')}
                      </h3>
                      <div className="space-y-2">
                        {trending.slice(0, 5).map((product) => (
                          <TrendingProductCard
                            key={product.id}
                            product={product}
                            onClick={() => navigateToProduct(product.slug, product.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {showResults && (
              <div className="p-2">
                <div className="mb-1 px-3 py-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t('search.instantResults')}
                  </span>
                </div>
                <ul>
                  {results.map((product, idx) => (
                    <li key={product.id}>
                      <button
                        onClick={() => navigateToProduct(product.slug, product.id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          idx === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Image */}
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <Search className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice(product.price, product.currency)}
                            </span>
                            {product.hasDiscount && product.compareAtPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.compareAtPrice, product.currency)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Discount badge */}
                        {product.hasDiscount && product.compareAtPrice && (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                            -
                            {Math.round(
                              ((product.compareAtPrice - product.price) / product.compareAtPrice) *
                                100,
                            )}
                            %
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>

                {/* View all results */}
                <button
                  onClick={() => navigateToSearch(query)}
                  onMouseEnter={() => setActiveIndex(results.length)}
                  className={`mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    activeIndex === results.length
                      ? 'bg-accent/5 text-accent'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {t('search.viewAllResults', { count: String(totalResults) })}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* No results */}
            {showNoResults && (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">{t('search.noInstantResults', { query })}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS animation */}
      <style jsx global>{`
        @keyframes search-slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-search-slide-down {
          animation: search-slide-down 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}

/** Compact trending product card */
function TrendingProductCard({
  product,
  onClick,
}: {
  product: TrendingProductItem;
  onClick: () => void;
}) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-gray-50"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-700">{product.name}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.compareAtPrice!, product.currency)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
