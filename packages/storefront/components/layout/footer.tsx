'use client';

import Link from 'next/link';
import { useTranslation } from '@forkcart/i18n/react';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              {t('footer.shop')}
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900">
                  {t('footer.allProducts')}
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-gray-500 hover:text-gray-900">
                  {t('common.search')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              {t('footer.company')}
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/p/about-us" className="text-sm text-gray-500 hover:text-gray-900">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/p/contact" className="text-sm text-gray-500 hover:text-gray-900">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              {t('footer.legal')}
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/p/privacy-policy"
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/p/terms-of-service"
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/p/imprint" className="text-sm text-gray-500 hover:text-gray-900">
                  {t('footer.imprint')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              {t('footer.newsletter')}
            </h3>
            <p className="mt-4 text-sm text-gray-500">{t('footer.newsletterSubtext')}</p>
            <form className="mt-3 flex gap-2">
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="h-9 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {t('footer.subscribe')}
              </button>
            </form>
          </div>
        </div>
        <div className="mt-12 border-t pt-6 text-center text-xs text-gray-400">
          {t('footer.copyright', { year: new Date().getFullYear(), shopName: 'ForkCart' })}
        </div>
      </div>
    </footer>
  );
}
