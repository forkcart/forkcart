'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Star } from 'lucide-react';
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

interface FormData {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: string;
  isDefault: boolean;
  isActive: boolean;
  exchangeRate: string;
}

const emptyForm: FormData = {
  code: '',
  name: '',
  symbol: '',
  decimalPlaces: '2',
  isDefault: false,
  isActive: true,
  exchangeRate: '1.00000',
};

function rateToDisplay(rate: number): string {
  return (rate / 100000).toFixed(5);
}

function displayToRate(display: string): number {
  const val = parseFloat(display);
  return isNaN(val) ? 100000 : Math.round(val * 100000);
}

export default function CurrenciesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiClient<{ data: Currency[] }>('/currencies/all'),
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/currencies', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, input }: { code: string; input: Record<string, unknown> }) =>
      apiClient(`/currencies/${code}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => apiClient(`/currencies/${code}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });

  function openCreate() {
    setEditingCode(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(currency: Currency) {
    setEditingCode(currency.code);
    setForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: String(currency.decimalPlaces),
      isDefault: currency.isDefault,
      isActive: currency.isActive,
      exchangeRate: rateToDisplay(currency.exchangeRate),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCode(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input: Record<string, unknown> = {
      code: form.code.toUpperCase(),
      name: form.name,
      symbol: form.symbol,
      decimalPlaces: parseInt(form.decimalPlaces, 10),
      isDefault: form.isDefault,
      isActive: form.isActive,
      exchangeRate: displayToRate(form.exchangeRate),
    };

    if (editingCode) {
      updateMutation.mutate({ code: editingCode, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const currencies = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Currencies</h1>
          <p className="mt-1 text-muted-foreground">
            Manage currencies and exchange rates for your store
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Currency
        </button>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading currencies...</div>
        )}

        {error && (
          <div className="p-8 text-center text-destructive">Failed to load currencies.</div>
        )}

        {!isLoading && currencies.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No currencies yet. Create the first one.
          </div>
        )}

        {currencies.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium">Decimals</th>
                <th className="p-4 font-medium">Exchange Rate</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr key={currency.code} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{currency.code}</span>
                      {currency.isDefault && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">{currency.name}</td>
                  <td className="p-4 font-mono">{currency.symbol}</td>
                  <td className="p-4">{currency.decimalPlaces}</td>
                  <td className="p-4 font-mono">
                    {currency.isDefault ? '1.00000 (base)' : rateToDisplay(currency.exchangeRate)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        currency.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(currency)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!currency.isDefault && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete currency ${currency.code}?`)) {
                              deleteMutation.mutate(currency.code);
                            }
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingCode ? `Edit ${editingCode}` : 'New Currency'}
              </h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Code</label>
                  <input
                    required
                    maxLength={3}
                    disabled={!!editingCode}
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 font-mono text-sm uppercase disabled:opacity-50"
                    placeholder="USD"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <input
                    required
                    value={form.symbol}
                    onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="$"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="US Dollar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Decimal Places</label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={form.decimalPlaces}
                    onChange={(e) => setForm((f) => ({ ...f, decimalPlaces: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Exchange Rate</label>
                  <input
                    required
                    value={form.exchangeRate}
                    onChange={(e) => setForm((f) => ({ ...f, exchangeRate: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 font-mono text-sm"
                    placeholder="1.08500"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    1 default currency = X this currency
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="isDefault" className="text-sm font-medium">
                    Default Currency
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {editingCode ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
