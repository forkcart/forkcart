import type { Metadata } from 'next';
import { getProductBySlug, getPageByType } from '@/lib/api';
import { ProductContent, ProductNotFound } from './product-content';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { ProductPageRenderer } from '@/components/page-builder/product-page-renderer';
import { ProductPageSlots } from './product-slots';

const BASE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    return {
      title: product.name,
      description: product.shortDescription ?? product.description?.slice(0, 160) ?? undefined,
      alternates: {
        canonical: `${BASE_URL}/product/${slug}`,
      },
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

  const seoEl = (
    <>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/category/all' },
          { name: product.name, url: `/product/${product.slug}` },
        ]}
      />
    </>
  );

  // Try to use Page Builder layout for product pages
  const pbPage = await getPageByType('product');
  if (pbPage?.content) {
    return (
      <>
        {seoEl}
        {/* Plugin slot: product page top */}
        <ProductPageSlots position="top" />
        <div className="container-page py-12">
          <ProductPageRenderer content={pbPage.content} product={product} />
        </div>
        {/* Plugin slot: product page bottom */}
        <ProductPageSlots position="bottom" />
      </>
    );
  }

  // Fallback: hardcoded product layout
  return (
    <>
      {seoEl}
      {/* Plugin slot: product page top */}
      <ProductPageSlots position="top" />
      <ProductContent product={product} />
      {/* Plugin slot: product page bottom */}
      <ProductPageSlots position="bottom" />
    </>
  );
}
