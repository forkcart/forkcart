import type { Metadata } from 'next';
import { searchProducts } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { SearchInput } from './search-input';
import { Search } from 'lucide-react';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : 'Search',
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;

  let products: any[] = [];
  let total = 0;

  if (q) {
    try {
      const res = await searchProducts(q);
      products = res.data;
      total = res.pagination.total;
    } catch {
      // API not available
    }
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Search</h1>

      <div className="mt-6">
        <SearchInput defaultValue={q ?? ''} />
      </div>

      {q && (
        <p className="mt-4 text-sm text-gray-500">
          {total} result{total !== 1 ? 's' : ''} for &quot;{q}&quot;
        </p>
      )}

      {!q && (
        <div className="mt-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Type something to search our products.</p>
        </div>
      )}

      {q && products.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {q && products.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400">No products found for &quot;{q}&quot;.</p>
        </div>
      )}
    </div>
  );
}
