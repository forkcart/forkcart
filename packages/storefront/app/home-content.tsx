'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@forkcart/i18n/react';
import { ProductCard } from '@/components/product/product-card';

interface HomeContentProps {
  products: any[];
  categories: any[];
}

export function HomeContent({ products, categories }: HomeContentProps) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50">
        <div className="container-page py-24 text-center lg:py-32">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t('home.hero.title')} <span className="text-accent">{t('home.hero.titleAccent')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">{t('home.hero.subtitle')}</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              {t('home.hero.shopNow')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-page py-16">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('home.shopByCategory')}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((cat: any) => (
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
                  {t('home.browse')} <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container-page py-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('home.featuredProducts')}
          </h2>
          <Link href="/products" className="text-sm font-medium text-accent hover:underline">
            {t('home.viewAll')}
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-gray-400">{t('home.noProducts')}</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gray-900">
        <div className="container-page py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('home.cta.title')}</h2>
          <p className="mx-auto mt-3 max-w-md text-gray-400">{t('home.cta.subtitle')}</p>
          <Link
            href="https://github.com/forkcart/forkcart"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
          >
            {t('home.cta.github')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
