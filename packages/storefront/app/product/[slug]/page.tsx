import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/api';
import { formatPrice } from '@forkcart/shared';
import { AddToCartButton } from './add-to-cart-button';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: product.name,
      description: product.shortDescription ?? product.description?.slice(0, 160) ?? undefined,
      openGraph: {
        title: product.name,
        description: product.shortDescription ?? undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <p className="mt-2 text-gray-500">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
      </div>
    );
  }

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const inStock = product.inventoryQuantity > 0 || !product.trackInventory;

  return (
    <div className="container-page py-12">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
          <div className="flex h-full items-center justify-center text-gray-300">
            <svg className="h-32 w-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.sku && (
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">SKU: {product.sku}</p>
          )}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 lg:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(product.price, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compareAtPrice!, product.currency)}
              </span>
            )}
          </div>

          <div className="mt-3">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Out of stock
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-gray-600">{product.shortDescription}</p>
          )}

          <div className="mt-8">
            <AddToCartButton
              product={{ id: product.id, name: product.name, slug: product.slug, price: product.price }}
              disabled={!inStock}
            />
          </div>

          {product.description && (
            <div className="mt-10 border-t pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">Description</h2>
              <div className="mt-3 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
