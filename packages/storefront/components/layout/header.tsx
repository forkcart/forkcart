'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ShoppingBag, Menu, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/cart-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { useTranslation, LanguageSwitcher } from '@forkcart/i18n/react';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { itemCount } = useCart();
  const { customer } = useAuth();
  const { t } = useTranslation();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="container-page">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold tracking-tight">
            ForkCart
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              {t('nav.home')}
            </Link>
            <Link
              href="/category/all"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              {t('nav.shop')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.searchPlaceholder')}
                  className="h-9 w-48 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            <LanguageSwitcher className="hidden rounded-md border bg-transparent px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 md:block" />

            <Link
              href={customer ? '/account' : '/account/login'}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              <User className="h-5 w-5" />
            </Link>

            <Link href="/cart" className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100">
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>

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
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-gray-600"
            >
              {t('nav.home')}
            </Link>
            <Link
              href="/category/all"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-gray-600"
            >
              {t('nav.shop')}
            </Link>
            <div className="pt-2">
              <LanguageSwitcher className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-gray-600" />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
