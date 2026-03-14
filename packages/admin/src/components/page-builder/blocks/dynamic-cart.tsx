'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { ShoppingCart } from 'lucide-react';

export interface DynamicCartProps {
  showCoupons?: boolean;
}

/** Dynamic Cart — renders the actual shopping cart on the storefront */
export const DynamicCart: UserComponent<DynamicCartProps> = ({ showCoupons = true }) => {
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
      <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-8">
        <div className="mb-4 flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          <span className="text-lg font-semibold text-green-900">Shopping Cart</span>
          <span className="rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
            Dynamic
          </span>
        </div>
        <p className="text-sm text-green-700">
          This block renders the actual shopping cart with items, quantities, coupons, and checkout
          button.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-green-100 p-3">
            <div className="h-12 w-12 rounded bg-green-200" />
            <div className="flex-1">
              <div className="h-3 w-32 rounded bg-green-200" />
              <div className="mt-1 h-3 w-16 rounded bg-green-200" />
            </div>
            <div className="h-3 w-16 rounded bg-green-200" />
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-green-100 p-3">
            <div className="h-12 w-12 rounded bg-green-200" />
            <div className="flex-1">
              <div className="h-3 w-24 rounded bg-green-200" />
              <div className="mt-1 h-3 w-16 rounded bg-green-200" />
            </div>
            <div className="h-3 w-16 rounded bg-green-200" />
          </div>
        </div>
        {showCoupons && (
          <span className="mt-3 inline-block rounded bg-green-100 px-2 py-1 text-xs text-green-600">
            🏷️ Coupon input enabled
          </span>
        )}
      </div>
    </div>
  );
};

DynamicCart.craft = {
  displayName: 'Shopping Cart',
  props: {
    showCoupons: true,
  },
};
