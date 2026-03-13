'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { formatPrice } from '@forkcart/shared';
import { apiClient } from '@/lib/api-client';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerCustomer: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  enabled: boolean;
  createdAt: string;
}

interface FormData {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: string;
  minOrderAmount: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  startsAt: string;
  expiresAt: string;
  enabled: boolean;
}

const emptyForm: FormData = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '',
  maxUses: '',
  maxUsesPerCustomer: '',
  startsAt: '',
  expiresAt: '',
  enabled: true,
};

function formatCouponValue(type: string, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}%`;
    case 'fixed_amount':
      return formatPrice(value);
    case 'free_shipping':
      return 'Free Shipping';
    default:
      return String(value);
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => apiClient<{ data: Coupon[] }>('/coupons'),
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/coupons', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      apiClient(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiClient(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value:
        coupon.type === 'fixed_amount' ? (coupon.value / 100).toFixed(2) : String(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? (coupon.minOrderAmount / 100).toFixed(2) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      maxUsesPerCustomer: coupon.maxUsesPerCustomer ? String(coupon.maxUsesPerCustomer) : '',
      startsAt: toDateInputValue(coupon.startsAt),
      expiresAt: toDateInputValue(coupon.expiresAt),
      enabled: coupon.enabled,
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
      code: form.code,
      type: form.type,
      value:
        form.type === 'fixed_amount'
          ? Math.round(parseFloat(form.value.replace(',', '.')) * 100)
          : parseInt(form.value, 10),
      enabled: form.enabled,
    };

    if (form.minOrderAmount) {
      input['minOrderAmount'] = Math.round(parseFloat(form.minOrderAmount.replace(',', '.')) * 100);
    } else {
      input['minOrderAmount'] = null;
    }

    if (form.maxUses) input['maxUses'] = parseInt(form.maxUses, 10);
    else input['maxUses'] = null;

    if (form.maxUsesPerCustomer)
      input['maxUsesPerCustomer'] = parseInt(form.maxUsesPerCustomer, 10);
    else input['maxUsesPerCustomer'] = null;

    input['startsAt'] = form.startsAt ? new Date(form.startsAt).toISOString() : null;
    input['expiresAt'] = form.expiresAt ? new Date(form.expiresAt).toISOString() : null;

    if (editingId) {
      updateMutation.mutate({ id: editingId, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const coupons = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="mt-1 text-muted-foreground">Manage discount codes and promotions</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading coupons...</div>
        )}

        {error && <div className="p-8 text-center text-destructive">Failed to load coupons.</div>}

        {!isLoading && coupons.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No coupons yet. Create the first one.
          </div>
        )}

        {coupons.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Value</th>
                <th className="p-4 font-medium">Usage</th>
                <th className="p-4 font-medium">Expires</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4">
                    <code className="rounded bg-muted px-2 py-1 text-sm font-semibold">
                      {coupon.code}
                    </code>
                  </td>
                  <td className="p-4 text-sm capitalize">{coupon.type.replace('_', ' ')}</td>
                  <td className="p-4 text-sm font-medium">
                    {formatCouponValue(coupon.type, coupon.value)}
                  </td>
                  <td className="p-4 text-sm">
                    {coupon.usedCount}
                    {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ''}
                  </td>
                  <td className="p-4 text-sm">{formatDate(coupon.expiresAt)}</td>
                  <td className="p-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: coupon.id,
                          enabled: !coupon.enabled,
                        })
                      }
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        coupon.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {coupon.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this coupon?')) {
                            deleteMutation.mutate(coupon.id);
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
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm uppercase"
                  placeholder="e.g. SUMMER20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        type: e.target.value as FormData['type'],
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {form.type === 'percentage'
                      ? 'Value (%)'
                      : form.type === 'fixed_amount'
                        ? 'Value (€)'
                        : 'Value'}
                  </label>
                  <input
                    required={form.type !== 'free_shipping'}
                    disabled={form.type === 'free_shipping'}
                    value={form.type === 'free_shipping' ? '0' : form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
                    placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 5.00'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min. Order Amount (€)</label>
                  <input
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Uses</label>
                  <input
                    value={form.maxUses}
                    onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                    placeholder="unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Max Uses Per Customer</label>
                <input
                  value={form.maxUsesPerCustomer}
                  onChange={(e) => setForm((f) => ({ ...f, maxUsesPerCustomer: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  placeholder="unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Starts At</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Expires At</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="enabled" className="text-sm font-medium">
                  Enabled
                </label>
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
