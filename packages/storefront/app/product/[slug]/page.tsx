import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/api';
import { ProductContent, ProductNotFound } from './product-content';

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
    return <ProductNotFound />;
  }

  return <ProductContent product={product} />;
}
