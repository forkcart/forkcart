import { getProducts } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';

export interface ProductGridProps {
  limit?: number;
  categoryId?: string;
  sortBy?: string;
  sortDirection?: string;
  columns?: 2 | 3 | 4;
  title?: string;
  className?: string;
}

export async function RenderProductGrid({
  limit = 8,
  categoryId,
  sortBy = 'createdAt',
  sortDirection = 'desc',
  columns = 4,
  title,
  className,
}: ProductGridProps) {
  let products: any[] = [];

  try {
    const res = await getProducts({ limit, categoryId, sortBy, sortDirection });
    products = res.data;
  } catch {
    // API not available
  }

  if (products.length === 0) return null;

  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <section className={`mx-auto w-full max-w-6xl px-6 py-12 ${className ?? ''}`}>
      {title && <h2 className="mb-6 text-2xl font-bold text-gray-900">{title}</h2>}
      <div className={`grid gap-6 ${gridCols[columns] ?? gridCols[4]}`}>
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
