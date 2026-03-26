'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TaxClass {
  id: string;
  name: string;
}

interface TaxZone {
  id: string;
  name: string;
  countries: string[];
}

interface TaxRule {
  id: string;
  name: string;
  taxClassId: string | null;
  taxZoneId: string | null;
  rate: string;
  priority: number;
  taxType: string;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
  taxClass: TaxClass | null;
  taxZone: TaxZone | null;
}

export default function TaxRulesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    taxClassId: '',
    taxZoneId: '',
    rate: '',
    priority: '0',
    taxType: 'VAT',
    isCompound: false,
    isDefault: false,
  });

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: () => apiClient<{ data: TaxRule[] }>('/tax/rules'),
  });

  const { data: classesData } = useQuery({
    queryKey: ['tax-classes'],
    queryFn: () => apiClient<{ data: TaxClass[] }>('/tax/classes'),
  });

  const { data: zonesData } = useQuery({
    queryKey: ['tax-zones'],
    queryFn: () => apiClient<{ data: TaxZone[] }>('/tax/zones'),
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiClient('/tax/rules', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      setShowForm(false);
      setFormData({
        name: '',
        taxClassId: '',
        taxZoneId: '',
        rate: '',
        priority: '0',
        taxType: 'VAT',
        isCompound: false,
        isDefault: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/tax/rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-rules'] }),
  });

  const rules = rulesData?.data ?? [];
  const classes = classesData?.data ?? [];
  const zones = zonesData?.data ?? [];

  function handleSubmit() {
    createMutation.mutate({
      name: formData.name,
      taxClassId: formData.taxClassId || null,
      taxZoneId: formData.taxZoneId || null,
      rate: formData.rate,
      priority: parseInt(formData.priority, 10),
      taxType: formData.taxType,
      isCompound: formData.isCompound,
      isDefault: formData.isDefault,
    });
  }

  function formatRate(rate: string): string {
    return `${(parseFloat(rate) * 100).toFixed(1)}%`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Rules</h1>
          <p className="mt-1 text-muted-foreground">
            Define tax rates for each class × zone combination
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Tax Rule
        </button>
      </div>

      {/* Matrix Overview */}
      {classes.length > 0 && zones.length > 0 && (
        <div className="mt-6 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Rate Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-muted-foreground">
                    Zone ↓ / Class →
                  </th>
                  {classes.map((cls) => (
                    <th key={cls.id} className="p-2 text-center font-medium">
                      {cls.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{zone.name}</td>
                    {classes.map((cls) => {
                      const matchingRule = rules.find(
                        (r) => r.taxClassId === cls.id && r.taxZoneId === zone.id,
                      );
                      return (
                        <td key={cls.id} className="p-2 text-center">
                          {matchingRule ? (
                            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              {formatRate(matchingRule.rate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="mt-6 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading tax rules...</div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-4">Name</th>
              <th className="p-4">Class</th>
              <th className="p-4">Zone</th>
              <th className="p-4">Rate</th>
              <th className="p-4">Type</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Flags</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {showForm && (
              <tr className="border-b bg-muted/30">
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Rule name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <select
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={formData.taxClassId}
                    onChange={(e) => setFormData({ ...formData, taxClassId: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <select
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={formData.taxZoneId}
                    onChange={(e) => setFormData({ ...formData, taxZoneId: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <input
                    className="w-20 rounded border px-2 py-1 text-sm"
                    placeholder="0.19"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-20 rounded border px-2 py-1 text-sm"
                    value={formData.taxType}
                    onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-16 rounded border px-2 py-1 text-sm"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    />
                    Default
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isCompound}
                      onChange={(e) => setFormData({ ...formData, isCompound: e.target.checked })}
                    />
                    Compound
                  </label>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={handleSubmit}
                    className="mr-2 text-green-600 hover:text-green-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{rule.name}</td>
                <td className="p-4 text-sm">{rule.taxClass?.name ?? '—'}</td>
                <td className="p-4 text-sm">{rule.taxZone?.name ?? '—'}</td>
                <td className="p-4">
                  <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {formatRate(rule.rate)}
                  </span>
                </td>
                <td className="p-4 text-sm">{rule.taxType}</td>
                <td className="p-4 text-sm">{rule.priority}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {rule.isDefault && (
                      <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                        Default
                      </span>
                    )}
                    {rule.isCompound && (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">
                        Compound
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
