'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import type { Product } from '@forkcart/shared';
import { ProductForm } from '@/components/products/product-form';
import { ProductImages } from '@/components/products/product-images';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === 'new';

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient<{ data: Product }>(`/products/${id}`),
    enabled: !isNew,
  });

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      isNew
        ? apiClient('/products', { method: 'POST', body: JSON.stringify(values) })
        : apiClient(`/products/${id}`, { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/products');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/products');
    },
  });

  if (!isNew && isLoading) {
    return <div className="text-muted-foreground">Loading product...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isNew ? 'New Product' : 'Edit Product'}</h1>
          <p className="mt-1 text-muted-foreground">
            {isNew ? 'Create a new product' : `Editing: ${data?.data.name}`}
          </p>
        </div>
        {!isNew && (
          <button
            onClick={() => deleteMutation.mutate()}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </button>
        )}
      </div>

      <div className="mt-8 space-y-8">
        <ProductForm
          initialData={isNew ? undefined : data?.data}
          onSubmit={(values) => saveMutation.mutate(values)}
          isSubmitting={saveMutation.isPending}
        />

        {/* Product Images — only show for existing products */}
        {!isNew && (
          <ProductImages productId={id} />
        )}
      </div>
    </div>
  );
}
