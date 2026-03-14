interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

const BASE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

interface ProductJsonLdProps {
  product: {
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    compareAtPrice?: number | null;
    currency?: string;
    sku?: string | null;
    inventoryQuantity: number;
    trackInventory: boolean;
    images?: Array<{ url: string }>;
  };
  reviewData?: {
    averageRating: number;
    reviewCount: number;
  };
}

export function ProductJsonLd({ product, reviewData }: ProductJsonLdProps) {
  const inStock = product.inventoryQuantity > 0 || !product.trackInventory;
  const currency = product.currency ?? 'EUR';
  const priceValue = (product.price / 100).toFixed(2);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url: `${BASE_URL}/product/${product.slug}`,
    ...(product.description ? { description: product.description.replace(/<[^>]*>/g, '') } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.images && product.images.length > 0
      ? { image: product.images.map((img) => img.url) }
      : {}),
    offers: {
      '@type': 'Offer',
      price: priceValue,
      priceCurrency: currency,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/product/${product.slug}`,
    },
  };

  if (reviewData && reviewData.reviewCount > 0) {
    data['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.averageRating.toFixed(1),
      reviewCount: reviewData.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return <JsonLd data={data} />;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };

  return <JsonLd data={data} />;
}
