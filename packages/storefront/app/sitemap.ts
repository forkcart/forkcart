import type { MetadataRoute } from 'next';
import { getProducts, getCategories } from '@/lib/api';

const BASE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Add product pages
  try {
    const products = await getProducts({ status: 'active', limit: 1000 });
    for (const product of products.data) {
      entries.push({
        url: `${BASE_URL}/product/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // API not available
  }

  // Add category pages
  try {
    const categories = await getCategories();
    for (const category of categories) {
      entries.push({
        url: `${BASE_URL}/category/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    // Add "all products" page
    entries.push({
      url: `${BASE_URL}/category/all`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    });
  } catch {
    // API not available
  }

  return entries;
}
