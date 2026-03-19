'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LocaleLink } from '@/components/locale-link';
import { useTranslation } from '@forkcart/i18n/react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChevronLeft, Loader2, MapPin, Plus, Trash2, Star } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

interface AddressFormData {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: 'DE',
  phone: '',
  isDefault: false,
};

export default function AddressesPage() {
  const { token, customer } = useAuth();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAddresses = useCallback(async () => {
    if (!token || !customer) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/storefront/customers/${customer.id}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.data ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [token, customer]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  function startEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      firstName: address.firstName,
      lastName: address.lastName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    setShowForm(true);
    setError('');
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !customer) return;
    setSaving(true);
    setError('');

    const url = editingId
      ? `${API_URL}/api/v1/storefront/customers/${customer.id}/addresses/${editingId}`
      : `${API_URL}/api/v1/storefront/customers/${customer.id}/addresses`;

    try {
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: { message?: string } }).error?.message ??
            t('account.addresses.saveFailed'),
        );
      }

      setShowForm(false);
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.addresses.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!token || !customer) return;
    if (!confirm(t('account.addresses.deleteConfirm'))) return;

    await fetch(`${API_URL}/api/v1/storefront/customers/${customer.id}/addresses/${addressId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchAddresses();
  }

  return (
    <ProtectedRoute>
      <div className="container-page py-12">
        <LocaleLink
          href="/account"
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> {t('account.backToAccount')}
        </LocaleLink>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('account.addresses')}
          </h1>
          {!showForm && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" /> {t('account.addresses.add')}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 rounded-lg border p-6">
            <h2 className="font-semibold text-gray-900">
              {editingId ? t('account.addresses.edit') : t('account.addresses.new')}
            </h2>

            {error && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('checkout.firstName')}
                </label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('checkout.lastName')}
                </label>
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">{t('checkout.address')}</label>
                <input
                  required
                  value={form.addressLine1}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('account.addresses.addressLine2')}
                </label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('checkout.city')}</label>
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('checkout.zip')}</label>
                <input
                  required
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('checkout.country')}</label>
                <select
                  required
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="DE">{t('countries.DE')}</option>
                  <option value="AT">{t('countries.AT')}</option>
                  <option value="CH">{t('countries.CH')}</option>
                  <option value="US">{t('countries.US')}</option>
                  <option value="GB">{t('countries.GB')}</option>
                  <option value="FR">{t('countries.FR')}</option>
                  <option value="NL">{t('countries.NL')}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('checkout.phone')}</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  {t('account.addresses.setDefault')}
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? t('account.addresses.update') : t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="mt-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">{t('account.addresses.noAddresses')}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {addr.firstName} {addr.lastName}
                      {addr.isDefault && (
                        <Star className="ml-2 inline h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{addr.addressLine1}</p>
                    {addr.addressLine2 && (
                      <p className="text-sm text-gray-500">{addr.addressLine2}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {addr.postalCode} {addr.city}, {addr.country}
                    </p>
                    {addr.phone && <p className="mt-1 text-sm text-gray-400">{addr.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(addr)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
