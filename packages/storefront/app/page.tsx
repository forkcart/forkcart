import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProducts, getCategories } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';

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

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50">
        <div className="container-page py-24 text-center lg:py-32">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Modern shopping,{' '}
            <span className="text-accent">beautifully simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">
            Discover curated products crafted with care. Free shipping on orders over €50.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/category/all"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-page py-16">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Shop by Category</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="group relative overflow-hidden rounded-lg bg-gray-100 p-8 transition hover:bg-gray-200"
              >
                <h3 className="text-lg font-semibold text-gray-900">{cat.name}</h3>
                {cat.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{cat.description}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Browse <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container-page py-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Featured Products</h2>
          <Link href="/category/all" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-400">Products will appear here once you add them in the admin panel.</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gray-900">
        <div className="container-page py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-md text-gray-400">
            ForkCart is open source and free forever. Self-host it or use our cloud.
          </p>
          <Link
            href="https://github.com/forkcart/forkcart"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
          >
            View on GitHub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
