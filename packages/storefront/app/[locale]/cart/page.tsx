'use client';

import { useState } from 'react';
import { Trash2, Minus, Plus, ShoppingBag, Tag, X, Loader2 } from 'lucide-react';
import { LocaleLink } from '@/components/locale-link';
import { useCart } from '@/components/cart/cart-provider';
import { useTranslation } from '@forkcart/i18n/react';
import { useCurrency } from '@/components/currency/currency-provider';
import { CartPageSlots } from './cart-slots';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

interface CouponResult {
  valid: boolean;
  discount: number;
  message: string;
  type?: string;
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  async function handleValidateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/public/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), cartTotal: subtotal }),
      });
      const json = (await res.json()) as { data: CouponResult };
      setCouponResult(json.data);
      if (json.data.valid) {
        setAppliedCode(couponCode.trim().toUpperCase());
      }
    } catch {
      setCouponResult({ valid: false, discount: 0, message: 'Failed to validate coupon' });
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponResult(null);
    setAppliedCode(null);
    setCouponCode('');
  }

  const discount = couponResult?.valid ? couponResult.discount : 0;
  const totalAfterDiscount = subtotal - discount;

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{t('cart.empty')}</h1>
        <p className="mt-2 text-gray-500">{t('cart.emptySubtext')}</p>
        <LocaleLink
          href="/category/all"
          className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('cart.continueShopping')}
        </LocaleLink>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      {/* Plugin slot: cart page top */}
      <CartPageSlots position="top" />
      
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('cart.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('cart.itemCount', { count: items.length })}</p>

      <div className="mt-8 grid gap-12 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 py-6">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <LocaleLink
                        href={`/product/${item.productSlug}`}
                        className="text-sm font-medium text-gray-900 hover:text-accent"
                      >
                        {item.productName}
                      </LocaleLink>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {formatPrice(item.unitPrice)} {t('cart.each')}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex items-center rounded border">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500"
                      title={t('cart.remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="rounded-lg bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('cart.orderSummary')}</h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('cart.subtotal')}</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Coupon Input */}
              <div className="border-t pt-3">
                {appliedCode ? (
                  <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">{appliedCode}</span>
                      <span className="text-sm text-green-600">−{formatPrice(discount)}</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleValidateCoupon();
                          }
                        }}
                        className="h-9 flex-1 rounded-md border px-3 text-sm uppercase placeholder:normal-case"
                        placeholder="Coupon code"
                      />
                      <button
                        onClick={handleValidateCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="inline-flex h-9 items-center rounded-md bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponResult && !couponResult.valid && (
                      <p className="mt-1 text-xs text-red-500">{couponResult.message}</p>
                    )}
                  </div>
                )}
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('cart.shipping')}</span>
                <span className="text-gray-500">{t('cart.shippingCalculated')}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-semibold">{t('cart.total')}</span>
                  <span className="text-base font-bold">{formatPrice(totalAfterDiscount)}</span>
                </div>
              </div>
            </div>

            <LocaleLink
              href={
                appliedCode ? `/checkout?coupon=${encodeURIComponent(appliedCode)}` : '/checkout'
              }
              className="mt-6 block w-full rounded-lg bg-gray-900 py-3 text-center text-sm font-medium text-white transition hover:bg-gray-800"
            >
              {t('cart.checkout')}
            </LocaleLink>

            <LocaleLink
              href="/category/all"
              className="mt-3 block text-center text-sm text-gray-500 hover:text-gray-900"
            >
              {t('cart.continueShopping')}
            </LocaleLink>
          </div>
        </div>
      </div>
      
      {/* Plugin slot: cart page bottom */}
      <CartPageSlots position="bottom" />
    </div>
  );
}
