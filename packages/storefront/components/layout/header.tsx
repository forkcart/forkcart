'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingBag, Menu, X, User } from 'lucide-react';
import { useCart } from '@/components/cart/cart-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { LocaleLink } from '@/components/locale-link';
import { StorefrontLanguageSwitcher } from '@/components/i18n/language-switcher';
import { CurrencySwitcher } from '@/components/currency/currency-switcher';
import { SearchOverlay } from './search-overlay';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount, setCartOpen } = useCart();
  const { customer } = useAuth();
  const { t } = useTranslation();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="container-page">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <LocaleLink href="/" className="flex items-center">
              <img src="/logo.png" alt="ForkCart" className="h-12 w-auto" />
            </LocaleLink>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-8 md:flex">
              <LocaleLink
                href="/"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                {t('nav.home')}
              </LocaleLink>
              <LocaleLink
                href="/products"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                {t('nav.shop')}
              </LocaleLink>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Search trigger */}
              <button
                onClick={openSearch}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-400 transition hover:border-gray-300 hover:text-gray-600 md:w-48"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{t('nav.searchPlaceholder')}</span>
                <kbd className="ml-auto hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 md:inline">
                  ⌘K
                </kbd>
              </button>

              <CurrencySwitcher className="hidden rounded-md border bg-transparent px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 md:block" />
              <StorefrontLanguageSwitcher className="hidden rounded-md border bg-transparent px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 md:block" />

              <LocaleLink
                href={customer ? '/account' : '/account/login'}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
              >
                <User className="h-5 w-5" />
              </LocaleLink>

              <button
                onClick={() => setCartOpen(true)}
                className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100"
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileOpen && (
            <nav className="border-t pb-4 pt-2 md:hidden">
              <LocaleLink
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-gray-600"
              >
                {t('nav.home')}
              </LocaleLink>
              <LocaleLink
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-gray-600"
              >
                {t('nav.shop')}
              </LocaleLink>
              <div className="flex gap-2 pt-2">
                <CurrencySwitcher className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm text-gray-600" />
                <StorefrontLanguageSwitcher className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm text-gray-600" />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}
