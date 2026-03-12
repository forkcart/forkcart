import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { formatPrice } from '@forkcart/shared';
import type { Product } from '@forkcart/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data: product } = await fetchApi<{ data: Product }>(`/products/${slug}`);
    return {
      title: product.name,
      description: product.shortDescription ?? product.description?.slice(0, 155) ?? '',
      openGraph: {
        title: product.name,
        description: product.shortDescription ?? '',
        type: 'website',
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product: Product;
  try {
    const res = await fetchApi<{ data: Product }>(`/products/${slug}`);
    product = res.data;
  } catch {
    notFound();
  }

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Product Image Placeholder */}
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
          <span className="text-gray-400">Product Image</span>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasDiscount && product.compareAtPrice && (
              <span className="text-lg text-gray-500 line-through">
                {formatPrice(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          <div className="mt-6">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                product.inventoryQuantity > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {product.inventoryQuantity > 0
                ? `In Stock (${product.inventoryQuantity} available)`
                : 'Out of Stock'}
            </span>
          </div>

          <button
            className="mt-8 w-full rounded-lg bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={product.inventoryQuantity === 0}
          >
            {product.inventoryQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>

          {product.sku && (
            <p className="mt-4 text-sm text-gray-500">SKU: {product.sku}</p>
          )}

          {product.description && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            sku: product.sku,
            offers: {
              '@type': 'Offer',
              price: (product.price / 100).toFixed(2),
              priceCurrency: product.currency,
              availability:
                product.inventoryQuantity > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
    </div>
  );
}
