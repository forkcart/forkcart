'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import type { Product } from '@forkcart/shared';
import { ProductForm } from '@/components/products/product-form';
import { ProductImages } from '@/components/products/product-images';
import { ProductVariants } from '@/components/products/product-variants';
import { ProductTranslations } from '@/components/products/product-translations';
import { ProductCurrencyPrices } from '@/components/products/product-currency-prices';

interface LanguageInfo {
  locale: string;
  name: string;
  nativeName: string;
  isDefault?: boolean;
}

interface TranslationData {
  locale?: string;
  name: string | null;
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const isNew = id === 'new';

  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: () => apiClient<{ data: LanguageInfo[] }>('/translations'),
  });
  const defaultLang =
    languagesData?.data?.find((l) => l.isDefault) ??
    languagesData?.data?.find((l) => l.locale === 'en');
  const defaultLocale = defaultLang?.locale ?? 'en';
  const defaultLangLabel = defaultLang?.nativeName ?? defaultLang?.name ?? 'English';

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient<{ data: Product }>(`/products/${id}`),
    enabled: !isNew,
  });

  // Fetch the default locale's translation to overlay on the product form
  const { data: defaultTranslation } = useQuery({
    queryKey: ['product-translation', id, defaultLocale],
    queryFn: () =>
      apiClient<{ data: TranslationData }>(`/products/${id}/translations/${defaultLocale}`).catch(
        () => null,
      ),
    enabled: !isNew && !!data,
  });

  // Merge: base product + default locale translation overlay for content fields
  const formData = useMemo(() => {
    if (!data?.data) return undefined;
    const base = data.data;
    const tr = defaultTranslation?.data;
    if (!tr) return base;
    return {
      ...base,
      name: tr.name ?? base.name,
      description: tr.description ?? base.description,
      shortDescription: tr.shortDescription ?? base.shortDescription,
      metaTitle:
        (tr.metaTitle as string) ?? ((base as Record<string, unknown>).metaTitle as string) ?? '',
      metaDescription:
        (tr.metaDescription as string) ??
        ((base as Record<string, unknown>).metaDescription as string) ??
        '',
    } as Product;
  }, [data, defaultTranslation]);

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (isNew) {
        // Create sends everything — API auto-creates default locale translation
        return apiClient('/products', { method: 'POST', body: JSON.stringify(values) });
      }

      // Separate content fields from structural fields
      const contentFields = {
        name: values.name,
        description: values.description,
        shortDescription: values.shortDescription,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
      };

      // Structural fields go to products table (keep name for fallback/internal use)
      const structuralValues = { ...values };

      await Promise.all([
        apiClient(`/products/${id}`, { method: 'PUT', body: JSON.stringify(structuralValues) }),
        apiClient(`/products/${id}/translations/${defaultLocale}`, {
          method: 'PUT',
          body: JSON.stringify(contentFields),
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-translation', id, defaultLocale] });
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
            {isNew ? `Content in ${defaultLangLabel}` : `Editing: ${data?.data.name}`}
          </p>
          {!isNew && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Content in {defaultLangLabel} — other languages under Translations below
            </p>
          )}
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
          key={`${id}-${defaultLocale}-${defaultTranslation?.data?.name ?? 'base'}`}
          initialData={isNew ? undefined : formData}
          productId={isNew ? undefined : id}
          onSubmit={(values) => saveMutation.mutate(values)}
          isSubmitting={saveMutation.isPending}
        />

        {/* Product Images — only show for existing products */}
        {!isNew && <ProductImages productId={id} />}

        {/* Product Variants — only show for existing products */}
        {!isNew && <ProductVariants productId={id} />}

        {/* Product Currency Prices — only show for existing products */}
        {!isNew && <ProductCurrencyPrices productId={id} />}

        {/* Product Translations — only show for existing products */}
        {!isNew && <ProductTranslations productId={id} product={data?.data} />}
      </div>
    </div>
  );
}
