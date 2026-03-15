'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '@/components/currency/currency-provider';

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  inventoryQuantity: number;
  attributes: Record<string, string>;
  sortOrder: number;
}

interface VariantPickerProps {
  variants: Variant[];
  productPrice: number;
  currency?: string;
  onVariantChange: (variant: Variant | null) => void;
}

export function VariantPicker({
  variants,
  productPrice,
  currency,
  onVariantChange,
}: VariantPickerProps) {
  const { formatPrice } = useCurrency();
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Extract unique attribute names and their values from variants
  const attributeOptions = useMemo(() => {
    const attrMap: Record<string, Set<string>> = {};
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.attributes)) {
        if (!attrMap[key]) attrMap[key] = new Set();
        attrMap[key]!.add(value);
      }
    }
    return Object.entries(attrMap).map(([name, values]) => ({
      name,
      values: Array.from(values),
    }));
  }, [variants]);

  // If variants have no attributes (simple variants), show as a list
  const hasAttributes = attributeOptions.length > 0;

  // Find the variant matching the current selection
  const selectedVariant = useMemo(() => {
    if (!hasAttributes) return null;
    const selectedKeys = Object.keys(selectedAttributes).filter(
      (k) => selectedAttributes[k] !== '',
    );
    if (selectedKeys.length !== attributeOptions.length) return null;

    return (
      variants.find((v) =>
        attributeOptions.every(({ name }) => v.attributes[name] === selectedAttributes[name]),
      ) ?? null
    );
  }, [variants, selectedAttributes, attributeOptions, hasAttributes]);

  // Notify parent of variant change
  useEffect(() => {
    onVariantChange(selectedVariant);
  }, [selectedVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select if only one value per attribute
  useEffect(() => {
    if (hasAttributes && Object.keys(selectedAttributes).length === 0) {
      const initial: Record<string, string> = {};
      for (const attr of attributeOptions) {
        if (attr.values.length === 1) {
          initial[attr.name] = attr.values[0]!;
        }
      }
      if (Object.keys(initial).length > 0) {
        setSelectedAttributes(initial);
      }
    }
  }, [attributeOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (variants.length === 0) return null;

  // Check which values are available given current selections
  function isValueAvailable(attrName: string, value: string): boolean {
    const testSelection = { ...selectedAttributes, [attrName]: value };
    return variants.some((v) =>
      Object.entries(testSelection)
        .filter(([, val]) => val !== '')
        .every(([k, val]) => v.attributes[k] === val),
    );
  }

  function isValueInStock(attrName: string, value: string): boolean {
    const testSelection = { ...selectedAttributes, [attrName]: value };
    return variants.some(
      (v) =>
        Object.entries(testSelection)
          .filter(([, val]) => val !== '')
          .every(([k, val]) => v.attributes[k] === val) && v.inventoryQuantity > 0,
    );
  }

  // Simple variant list (no attributes, e.g. just named variants)
  if (!hasAttributes) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Variant</label>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const selected = selectedVariant?.id === v.id;
            const outOfStock = v.inventoryQuantity === 0;
            return (
              <button
                key={v.id}
                onClick={() => onVariantChange(selected ? null : v)}
                disabled={outOfStock}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : outOfStock
                      ? 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {v.name}
                {v.price !== null && v.price !== productPrice && (
                  <span className="ml-1 text-xs opacity-75">
                    ({formatPrice(v.price, currency)})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Attribute-based variant picker
  return (
    <div className="space-y-4">
      {attributeOptions.map(({ name, values }) => (
        <div key={name}>
          <label className="text-sm font-medium text-gray-700">
            {name}
            {selectedAttributes[name] && (
              <span className="ml-2 font-normal text-gray-500">{selectedAttributes[name]}</span>
            )}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.map((value) => {
              const selected = selectedAttributes[name] === value;
              const available = isValueAvailable(name, value);
              const inStock = isValueInStock(name, value);

              return (
                <button
                  key={value}
                  onClick={() =>
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      [name]: prev[name] === value ? '' : value,
                    }))
                  }
                  disabled={!available}
                  className={`relative rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : available
                        ? 'border-gray-200 text-gray-700 hover:border-gray-400'
                        : 'cursor-not-allowed border-gray-100 text-gray-300'
                  } ${!inStock && available ? 'border-dashed' : ''}`}
                >
                  {value}
                  {!inStock && available && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Out of stock warning */}
      {selectedVariant && selectedVariant.inventoryQuantity === 0 && (
        <div className="flex items-center gap-1.5 text-sm text-red-500">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          This variant is out of stock
        </div>
      )}
    </div>
  );
}
