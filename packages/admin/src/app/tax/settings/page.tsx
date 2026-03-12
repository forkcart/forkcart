'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TaxClass {
  id: string;
  name: string;
}

interface TaxSettingsData {
  id: string;
  taxDisplay: string;
  defaultTaxClassId: string | null;
  pricesEnteredWithTax: boolean;
  enableVatValidation: boolean;
  defaultCountry: string;
}

export default function TaxSettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    taxDisplay: 'inclusive',
    defaultTaxClassId: '',
    pricesEnteredWithTax: true,
    enableVatValidation: false,
    defaultCountry: 'DE',
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => apiClient<{ data: TaxSettingsData | null }>('/tax/settings'),
  });

  const { data: classesData } = useQuery({
    queryKey: ['tax-classes'],
    queryFn: () => apiClient<{ data: TaxClass[] }>('/tax/classes'),
  });

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setFormData({
        taxDisplay: s.taxDisplay,
        defaultTaxClassId: s.defaultTaxClassId ?? '',
        pricesEnteredWithTax: s.pricesEnteredWithTax,
        enableVatValidation: s.enableVatValidation,
        defaultCountry: s.defaultCountry,
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/tax/settings', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-settings'] }),
  });

  const classes = classesData?.data ?? [];

  function handleSave() {
    saveMutation.mutate({
      taxDisplay: formData.taxDisplay,
      defaultTaxClassId: formData.defaultTaxClassId || null,
      pricesEnteredWithTax: formData.pricesEnteredWithTax,
      enableVatValidation: formData.enableVatValidation,
      defaultCountry: formData.defaultCountry,
    });
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Settings</h1>
          <p className="mt-1 text-muted-foreground">Configure global tax behavior for your store</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saveMutation.isSuccess && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Settings saved successfully!
        </div>
      )}

      <div className="mt-8 max-w-2xl space-y-6">
        {/* Tax Display */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Tax Display</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="taxDisplay"
                value="inclusive"
                checked={formData.taxDisplay === 'inclusive'}
                onChange={() => setFormData({ ...formData, taxDisplay: 'inclusive' })}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Tax Inclusive (EU Standard)</div>
                <div className="text-sm text-muted-foreground">
                  Prices shown include tax. Common in Europe (€29.99 inkl. MwSt.)
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="taxDisplay"
                value="exclusive"
                checked={formData.taxDisplay === 'exclusive'}
                onChange={() => setFormData({ ...formData, taxDisplay: 'exclusive' })}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Tax Exclusive (US Style)</div>
                <div className="text-sm text-muted-foreground">
                  Prices shown without tax. Tax added at checkout. Common in the US ($29.99 + tax)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Price Entry */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Price Entry</h2>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.pricesEnteredWithTax}
              onChange={(e) => setFormData({ ...formData, pricesEnteredWithTax: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Prices entered with tax included</div>
              <div className="text-sm text-muted-foreground">
                When enabled, the catalog price you enter already includes tax. The system will
                extract the tax portion when calculating.
              </div>
            </div>
          </label>
        </div>

        {/* Default Tax Class */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Default Tax Class</h2>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={formData.defaultTaxClassId}
            onChange={(e) => setFormData({ ...formData, defaultTaxClassId: e.target.value })}
          >
            <option value="">— No default —</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied to products that don&apos;t have a specific tax class assigned.
          </p>
        </div>

        {/* Default Country */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Default Country</h2>
          <input
            className="w-24 rounded border px-3 py-2 text-sm uppercase"
            maxLength={2}
            placeholder="DE"
            value={formData.defaultCountry}
            onChange={(e) =>
              setFormData({ ...formData, defaultCountry: e.target.value.toUpperCase() })
            }
          />
          <p className="mt-1 text-sm text-muted-foreground">
            2-letter country code used for tax calculation when no shipping address is available.
          </p>
        </div>

        {/* VAT Validation */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">B2B / VAT Validation</h2>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.enableVatValidation}
              onChange={(e) => setFormData({ ...formData, enableVatValidation: e.target.checked })}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Enable VAT ID validation</div>
              <div className="text-sm text-muted-foreground">
                When enabled, B2B customers can enter their EU VAT ID at checkout. Valid IDs from
                other EU countries trigger reverse charge (0% VAT). Validated against the EU VIES
                service.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
