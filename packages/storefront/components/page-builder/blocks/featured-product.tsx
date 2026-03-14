import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedProductProps {
  productSlug?: string;
  layout?: 'left' | 'right';
  backgroundColor?: string;
  showDescription?: boolean;
  ctaText?: string;
}

async function fetchProduct(slug: string) {
  const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${API_URL}/api/v1/products/slug/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function RenderFeaturedProduct({
  productSlug,
  layout = 'left',
  backgroundColor = '#f9fafb',
  showDescription = true,
  ctaText = 'View Product',
}: FeaturedProductProps) {
  if (!productSlug) return null;

  const product = await fetchProduct(productSlug);
  if (!product) return null;

  const price = typeof product.price === 'number' ? (product.price / 100).toFixed(2) : '0.00';
  const imageUrl = product.images?.[0]?.url;

  return (
    <section className="w-full overflow-hidden rounded-xl" style={{ backgroundColor }}>
      <div
        className={cn(
          'mx-auto flex max-w-6xl flex-col items-center gap-8 p-8 md:flex-row md:p-12',
          layout === 'right' && 'md:flex-row-reverse',
        )}
      >
        <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-lg bg-white shadow-sm">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="400px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ShoppingCart className="h-16 w-16" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <span className="text-sm font-medium uppercase tracking-wider text-blue-600">
            Featured
          </span>
          <h2 className="text-3xl font-bold text-gray-900">{product.name}</h2>
          {showDescription && product.description && (
            <p className="text-lg leading-relaxed text-gray-600">
              {product.description.slice(0, 200)}
            </p>
          )}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-2xl font-bold text-gray-900">€{price}</span>
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <ShoppingCart className="h-4 w-4" />
              {ctaText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
