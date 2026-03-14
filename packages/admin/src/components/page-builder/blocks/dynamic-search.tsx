'use client';

import { useNode, type UserComponent } from '@craftjs/core';
import { Search } from 'lucide-react';

/** Dynamic Search Results — renders search results on the storefront */
export const DynamicSearch: UserComponent = () => {
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
      <div className="rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50 p-8">
        <div className="mb-4 flex items-center gap-3">
          <Search className="h-6 w-6 text-cyan-600" />
          <span className="text-lg font-semibold text-cyan-900">Search Results</span>
          <span className="rounded bg-cyan-200 px-2 py-0.5 text-xs font-medium text-cyan-700">
            Dynamic
          </span>
        </div>
        <p className="text-sm text-cyan-700">
          This block renders search results with filters, sorting, and product grid.
        </p>
      </div>
    </div>
  );
};

DynamicSearch.craft = {
  displayName: 'Search Results',
  props: {},
};
