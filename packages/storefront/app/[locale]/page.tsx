import { getProducts, getCategories, getHomepage, resolvePageForLocale } from '@/lib/api';
import { getI18nConfig } from '@/lib/i18n-config';
import { HomeContent } from './home-content';
import { PageRenderer } from '@/components/page-builder/renderer';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Try to load a custom homepage from the page builder
  try {
    const homepage = await getHomepage();
    if (homepage?.content) {
      // Resolve translated content for the current locale
      const i18n = await getI18nConfig();
      const resolved = resolvePageForLocale(homepage, locale, i18n.defaultLocale);

      return (
        <main>
          <PageRenderer content={resolved.content} locale={locale} />
        </main>
      );
    }
  } catch {
    // No homepage configured or API unavailable — fall through to default
  }

  // Fallback: render the default HomeContent
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
