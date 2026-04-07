'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
} from 'lucide-react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import type { Product, Category } from '@forkcart/shared';

interface LanguageInfo {
  locale: string;
  isDefault?: boolean;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryWithCount extends Category {
  productCount?: number;
}

const PAGE_SIZE = 25;

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Build pagination page numbers with ellipsis */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL state
  const page = Number(searchParams.get('page') ?? '1');
  const searchQuery = searchParams.get('search') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const categoryFilter = searchParams.get('categoryId') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDirection = searchParams.get('sortDirection') ?? 'desc';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateParams({ search: debouncedSearch, page: '1' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Get default locale
  const { data: langData } = useQuery({
    queryKey: ['languages'],
    queryFn: () => apiClient<{ data: LanguageInfo[] }>('/translations'),
  });
  const defaultLocale =
    langData?.data?.find((l) => l.isDefault)?.locale ??
    langData?.data?.find((l) => l.locale === 'en')?.locale;

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient<{ data: CategoryWithCount[] }>('/categories'),
  });

  // Build query string for products
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (defaultLocale) params.set('locale', defaultLocale);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    params.set('sortBy', sortBy);
    params.set('sortDirection', sortDirection);
    return params.toString();
  }, [defaultLocale, page, searchQuery, statusFilter, categoryFilter, sortBy, sortDirection]);

  // Fetch products
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', queryString],
    queryFn: () =>
      apiClient<{ data: Product[]; pagination: PaginationMeta }>(`/products?${queryString}`),
    enabled: !!langData,
    placeholderData: (prev) => prev,
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const showFrom = (pagination.page - 1) * pagination.limit + 1;
  const showTo = Math.min(pagination.page * pagination.limit, pagination.total);

  function handleSort(column: string) {
    if (sortBy === column) {
      updateParams({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sortBy: column, sortDirection: 'asc' });
    }
  }

  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return <ChevronDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Products{pagination.total > 0 ? ` (${pagination.total})` : ''}
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/v1/products/csv';
            }}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <label className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted cursor-pointer">
            <Upload className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const res = await fetch('/api/v1/products/csv', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                  });
                  const json = await res.json();
                  if (json.data) {
                    const d = json.data;
                    alert(
                      `Import complete!\n\nCreated: ${d.created}\nUpdated: ${d.updated}\nSkipped: ${d.skipped}${d.errors?.length ? `\nErrors: ${d.errors.map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`).join('\n')}` : ''}`,
                    );
                    window.location.reload();
                  } else {
                    alert(json.error?.message ?? 'Import failed');
                  }
                } catch {
                  alert('Import failed — check the CSV format');
                }
                e.target.value = '';
              }}
            />
          </label>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => updateParams({ categoryId: e.target.value, page: '1' })}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Categories</option>
          {categoriesData?.data?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border bg-card shadow-sm relative">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery || statusFilter || categoryFilter
              ? 'No products match your filters.'
              : 'No products yet. Create your first product to get started.'}
          </div>
        )}

        {products.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Product
                    <SortIcon column="name" />
                  </button>
                </th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('price')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Price
                    <SortIcon column="price" />
                  </button>
                </th>
                <th className="p-4 font-medium">Inventory</th>
                <th className="p-4 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('createdAt')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Created
                    <SortIcon column="createdAt" />
                  </button>
                </th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sku ?? '—'}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="p-4">{formatPrice(product.price, product.currency)}</td>
                  <td className="p-4">{product.inventoryQuantity}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {showFrom}–{showTo} of {pagination.total} products
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers(page, pagination.totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateParams({ page: String(p) })}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                    p === page ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
