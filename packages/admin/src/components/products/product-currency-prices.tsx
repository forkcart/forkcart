'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
  isActive: boolean;
  exchangeRate: number;
}

interface ProductPrice {
  id: string;
  productId: string;
  currencyCode: string;
  price: number;
  compareAtPrice: number | null;
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number {
  const val = parseFloat(display.replace(',', '.'));
  return isNaN(val) ? 0 : Math.round(val * 100);
}

export function ProductCurrencyPrices({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [editPrices, setEditPrices] = useState<
    Record<string, { price: string; compareAtPrice: string }>
  >({});
  const [addingCurrency, setAddingCurrency] = useState('');

  const { data: currenciesData } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiClient<{ data: Currency[] }>('/currencies/all'),
  });

  const { data: pricesData, isLoading } = useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => apiClient<{ data: ProductPrice[] }>(`/currencies/product-prices/${productId}`),
  });

  const upsertMutation = useMutation({
    mutationFn: ({
      currencyCode,
      price,
      compareAtPrice,
    }: {
      currencyCode: string;
      price: number;
      compareAtPrice: number | null;
    }) =>
      apiClient(`/currencies/product-prices/${productId}/${currencyCode}`, {
        method: 'PUT',
        body: JSON.stringify({ price, compareAtPrice }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prices', productId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (currencyCode: string) =>
      apiClient(`/currencies/product-prices/${productId}/${currencyCode}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prices', productId] });
    },
  });

  const currencies = currenciesData?.data ?? [];
  const prices = pricesData?.data ?? [];
  const activeCurrencies = currencies.filter((c) => c.isActive && !c.isDefault);
  const existingCodes = prices.map((p) => p.currencyCode);
  const availableCurrencies = activeCurrencies.filter((c) => !existingCodes.includes(c.code));

  function handleSave(currencyCode: string) {
    const edit = editPrices[currencyCode];
    if (!edit) return;
    upsertMutation.mutate({
      currencyCode,
      price: displayToCents(edit.price),
      compareAtPrice: edit.compareAtPrice ? displayToCents(edit.compareAtPrice) : null,
    });
    setEditPrices((prev) => {
      const next = { ...prev };
      delete next[currencyCode];
      return next;
    });
  }

  function handleAdd() {
    if (!addingCurrency) return;
    setEditPrices((prev) => ({
      ...prev,
      [addingCurrency]: { price: '', compareAtPrice: '' },
    }));
    setAddingCurrency('');
  }

  function getEditablePrice(pp: ProductPrice) {
    return (
      editPrices[pp.currencyCode] ?? {
        price: centsToDisplay(pp.price),
        compareAtPrice: pp.compareAtPrice ? centsToDisplay(pp.compareAtPrice) : '',
      }
    );
  }

  function startEdit(pp: ProductPrice) {
    setEditPrices((prev) => ({
      ...prev,
      [pp.currencyCode]: {
        price: centsToDisplay(pp.price),
        compareAtPrice: pp.compareAtPrice ? centsToDisplay(pp.compareAtPrice) : '',
      },
    }));
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Currency Price Overrides</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Set specific prices per currency. If not set, prices are automatically converted using
        exchange rates.
      </p>

      {isLoading ? (
        <div className="mt-4 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="mt-4 space-y-3">
          {prices.map((pp) => {
            const currency = currencies.find((c) => c.code === pp.currencyCode);
            const values = getEditablePrice(pp);
            const isEditing = !!editPrices[pp.currencyCode];
            return (
              <div key={pp.currencyCode} className="flex items-end gap-3 rounded-md border p-3">
                <div className="w-16">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {currency?.symbol} {pp.currencyCode}
                  </p>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Price</label>
                  <input
                    value={values.price}
                    onFocus={() => !isEditing && startEdit(pp)}
                    onChange={(e) =>
                      setEditPrices((prev) => ({
                        ...prev,
                        [pp.currencyCode]: {
                          ...prev[pp.currencyCode]!,
                          price: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Compare At Price
                  </label>
                  <input
                    value={values.compareAtPrice}
                    onFocus={() => !isEditing && startEdit(pp)}
                    onChange={(e) =>
                      setEditPrices((prev) => ({
                        ...prev,
                        [pp.currencyCode]: {
                          ...prev[pp.currencyCode]!,
                          compareAtPrice: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    placeholder="optional"
                  />
                </div>
                <div className="flex gap-1">
                  {isEditing && (
                    <button
                      onClick={() => handleSave(pp.currencyCode)}
                      disabled={upsertMutation.isPending}
                      className="rounded p-1.5 text-green-600 hover:bg-green-50"
                      title="Save"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${pp.currencyCode} price override?`)) {
                        deleteMutation.mutate(pp.currencyCode);
                      }
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* New currency price entries being added */}
          {Object.entries(editPrices)
            .filter(([code]) => !existingCodes.includes(code))
            .map(([code, values]) => {
              const currency = currencies.find((c) => c.code === code);
              return (
                <div
                  key={code}
                  className="flex items-end gap-3 rounded-md border border-dashed p-3"
                >
                  <div className="w-16">
                    <label className="text-xs font-medium text-muted-foreground">Currency</label>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {currency?.symbol} {code}
                    </p>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Price</label>
                    <input
                      value={values.price}
                      onChange={(e) =>
                        setEditPrices((prev) => ({
                          ...prev,
                          [code]: { ...prev[code]!, price: e.target.value },
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Compare At Price
                    </label>
                    <input
                      value={values.compareAtPrice}
                      onChange={(e) =>
                        setEditPrices((prev) => ({
                          ...prev,
                          [code]: { ...prev[code]!, compareAtPrice: e.target.value },
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                      placeholder="optional"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(code)}
                    disabled={upsertMutation.isPending || !values.price}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              );
            })}

          {/* Add currency button */}
          {availableCurrencies.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <select
                value={addingCurrency}
                onChange={(e) => setAddingCurrency(e.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">Select currency...</option>
                {availableCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!addingCurrency}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Price
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
