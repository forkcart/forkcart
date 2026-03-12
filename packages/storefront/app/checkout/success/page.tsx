'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/cart/cart-provider';
import { Check } from 'lucide-react';
import Link from 'next/link';

/**
 * Success page after Stripe redirect.
 * Stripe redirects here with payment_intent and payment_intent_client_secret in the URL.
 * The webhook will have already created the order by this point.
 */
export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  // Clear cart on mount (order was already created via webhook)
  useEffect(() => {
    clearCart();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container-page py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900">Payment successful!</h1>
      <p className="mt-2 text-gray-500">
        Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
      >
        Back to Home
      </Link>
    </div>
  );
}
