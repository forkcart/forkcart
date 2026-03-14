'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from './cart-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { formatPrice } from '@forkcart/shared';

export function CartDrawer() {
  const { items, itemCount, subtotal, cartOpen, setCartOpen, updateQuantity, removeItem } =
    useCart();
  const { t } = useTranslation();

  // Lock body scroll when open
  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCartOpen(false);
    }
    if (cartOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cartOpen, setCartOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('cart.title')}</h2>
            {itemCount > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <ShoppingBag className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t('cart.empty')}</p>
            <button
              onClick={() => setCartOpen(false)}
              className="mt-2 text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
            >
              {t('cart.continueShopping')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-lg border p-3">
                    {/* Product image */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/product/${item.productSlug}`}
                          onClick={() => setCartOpen(false)}
                          className="text-sm font-medium text-gray-900 hover:underline"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-2 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded border text-gray-500 transition hover:bg-gray-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded border text-gray-500 transition hover:bg-gray-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4">
              <div className="flex items-center justify-between pb-4">
                <span className="text-sm text-gray-600">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="block w-full rounded-lg bg-gray-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                {t('cart.checkout')}
              </Link>
              <button
                onClick={() => setCartOpen(false)}
                className="mt-2 block w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700"
              >
                {t('cart.continueShopping')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
