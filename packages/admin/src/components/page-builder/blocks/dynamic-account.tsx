'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { User } from 'lucide-react';

/** Dynamic Account — renders the account dashboard on the storefront */
export const DynamicAccount: UserComponent = () => {
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
      <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-8">
        <div className="mb-4 flex items-center gap-3">
          <User className="h-6 w-6 text-orange-600" />
          <span className="text-lg font-semibold text-orange-900">My Account</span>
          <span className="rounded bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-700">
            Dynamic
          </span>
        </div>
        <p className="text-sm text-orange-700">
          This block renders the customer account area: orders, addresses, profile settings.
        </p>
      </div>
    </div>
  );
};

DynamicAccount.craft = {
  displayName: 'Account Dashboard',
  props: {},
};
