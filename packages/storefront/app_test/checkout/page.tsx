'use client';

import { useState } from 'react';
import { formatPrice } from '@forkcart/shared';
import { useCart } from '@/components/cart/cart-provider';
import { Lock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<'form' | 'success'>('form');

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nothing to checkout</h1>
        <p className="mt-2 text-gray-500">Your cart is empty.</p>
        <Link
          href="/category/all"
          className="mt-6 inline-flex rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="container-page py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Order confirmed!</h1>
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearCart();
    setStep('success');
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Shipping Address */}
          <section className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className="text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  id="address"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="city" className="text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="city"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  required
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="country" className="text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="country"
                  required
                  className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select country</option>
                  <option value="DE">Germany</option>
                  <option value="AT">Austria</option>
                  <option value="CH">Switzerland</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                </select>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-lg border p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CreditCard className="h-5 w-5" />
              Payment
            </h2>
            <div className="mt-4 rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
              <p>Stripe payment integration will be connected here.</p>
              <p className="mt-1 text-xs text-gray-400">
                For demo purposes, click &quot;Place Order&quot; to complete.
              </p>
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div>
          <div className="sticky top-24 rounded-lg bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-4 divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <Lock className="h-4 w-4" />
              Place Order
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              Your payment is secure and encrypted
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
