'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';

interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedDays: string | null;
  isActive: boolean;
  countries: string[];
  minOrderValue: number | null;
  freeAbove: number | null;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  estimatedDays: string;
  isActive: boolean;
  countries: string[];
  minOrderValue: string;
  freeAbove: string;
}

const COUNTRY_OPTIONS = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'EU', label: 'EU-Länder' },
  { value: 'WORLDWIDE', label: 'Weltweit' },
];

const emptyForm: FormData = {
  name: '',
  description: '',
  price: '',
  estimatedDays: '',
  isActive: true,
  countries: [],
  minOrderValue: '',
  freeAbove: '',
};

function euroToCents(euroStr: string): number {
  const val = parseFloat(euroStr.replace(',', '.'));
  return isNaN(val) ? 0 : Math.round(val * 100);
}

function centsToEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function ShippingPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shipping-methods'],
    queryFn: () => apiClient<{ data: ShippingMethod[] }>('/shipping/methods/all'),
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/shipping/methods', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiClient(`/shipping/methods/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/shipping/methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-methods'] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(method: ShippingMethod) {
    setEditingId(method.id);
    setForm({
      name: method.name,
      description: method.description ?? '',
      price: centsToEuro(method.price),
      estimatedDays: method.estimatedDays ?? '',
      isActive: method.isActive,
      countries: method.countries,
      minOrderValue: method.minOrderValue ? centsToEuro(method.minOrderValue) : '',
      freeAbove: method.freeAbove ? centsToEuro(method.freeAbove) : '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input: Record<string, unknown> = {
      name: form.name,
      description: form.description || undefined,
      price: euroToCents(form.price),
      estimatedDays: form.estimatedDays || undefined,
      isActive: form.isActive,
      countries: form.countries,
    };

    if (form.minOrderValue) input['minOrderValue'] = euroToCents(form.minOrderValue);
    else input['minOrderValue'] = null;

    if (form.freeAbove) input['freeAbove'] = euroToCents(form.freeAbove);
    else input['freeAbove'] = null;

    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  }

  function toggleCountry(code: string) {
    setForm((f) => ({
      ...f,
      countries: f.countries.includes(code)
        ? f.countries.filter((c) => c !== code)
        : [...f.countries, code],
    }));
  }

  const methods = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipping Methods</h1>
          <p className="mt-1 text-muted-foreground">Manage shipping methods and rates</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Shipping Method
        </button>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading shipping methods...</div>
        )}

        {error && (
          <div className="p-8 text-center text-destructive">Failed to load shipping methods.</div>
        )}

        {!isLoading && methods.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No shipping methods yet. Create the first one.
          </div>
        )}

        {methods.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Preis</th>
                <th className="p-4 font-medium">Lieferzeit</th>
                <th className="p-4 font-medium">Länder</th>
                <th className="p-4 font-medium">Kostenlos ab</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method) => (
                <tr key={method.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <p className="font-medium">{method.name}</p>
                    {method.description && (
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    )}
                  </td>
                  <td className="p-4">{formatPrice(method.price)}</td>
                  <td className="p-4">
                    {method.estimatedDays ? `${method.estimatedDays} Tage` : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {method.countries.map((c) => (
                        <span
                          key={c}
                          className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">{method.freeAbove ? formatPrice(method.freeAbove) : '—'}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        method.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {method.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(method)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this shipping method?')) {
                            deleteMutation.mutate(method.id);
                          }
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                {editingId ? 'Edit Shipping Method' : 'New Shipping Method'}
              </h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="z.B. Standardversand"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Preis (€)</label>
                  <input
                    required
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="4,99"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lieferzeit (Tage)</label>
                  <input
                    value={form.estimatedDays}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="3-5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mindestbestellwert (€)</label>
                  <input
                    value={form.minOrderValue}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kostenlos ab (€)</label>
                  <input
                    value={form.freeAbove}
                    onChange={(e) => setForm((f) => ({ ...f, freeAbove: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="z.B. 49,00"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Länder</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleCountry(opt.value)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        form.countries.includes(opt.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Aktiv
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
