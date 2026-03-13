import { getProducts, getCategories } from '@/lib/api';
import { HomeContent } from './home-content';

export default async function HomePage() {
  let products: any[] = [];
  let categories: any[] = [];

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      getProducts({ limit: 8, sortBy: 'createdAt', sortDirection: 'desc' }),
      getCategories(),
    ]);
    products = productsRes.data;
    categories = categoriesRes;
  } catch {
    // API not available yet — show placeholder
  }

  return <HomeContent products={products} categories={categories} />;
}
