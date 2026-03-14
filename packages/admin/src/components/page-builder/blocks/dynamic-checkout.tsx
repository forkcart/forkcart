'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { CreditCard } from 'lucide-react';

/** Dynamic Checkout — renders the actual checkout flow on the storefront */
export const DynamicCheckout: UserComponent = () => {
  const {
    connectors: { connect },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(ref);
      }}
      className="mx-auto w-full max-w-6xl px-6 py-12"
    >
      <div className="rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 p-8">
        <div className="mb-4 flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-purple-600" />
          <span className="text-lg font-semibold text-purple-900">Checkout</span>
          <span className="rounded bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700">
            Dynamic
          </span>
        </div>
        <p className="text-sm text-purple-700">
          This block renders the full checkout flow: address, shipping, payment, and order
          confirmation.
        </p>
        <div className="mt-4 flex gap-2">
          {['1. Address', '2. Shipping', '3. Payment', '4. Review'].map((step) => (
            <div
              key={step}
              className="flex-1 rounded-lg bg-purple-100 p-2 text-center text-xs text-purple-600"
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

DynamicCheckout.craft = {
  displayName: 'Checkout Flow',
  props: {},
};
