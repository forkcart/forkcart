import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkout',
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <div className="mt-8 rounded-lg border p-8 text-center">
        <p className="text-gray-500">
          Checkout is coming soon. Add items to your cart first.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}
