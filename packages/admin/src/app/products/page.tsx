'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@forkcart/shared';

export default function ProductsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient<{ data: Product[]; pagination: { total: number } }>('/products'),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="mt-1 text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading products...</div>
        )}

        {error && (
          <div className="p-8 text-center text-destructive">
            Failed to load products. Make sure the API server is running.
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No products yet. Create your first product to get started.
          </div>
        )}

        {data && data.data.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Inventory</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((product) => (
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
    </div>
  );
}
