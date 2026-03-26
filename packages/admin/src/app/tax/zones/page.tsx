'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Check, X, Globe } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TaxZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  isActive: boolean;
}

export default function TaxZonesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', countries: '', states: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['tax-zones'],
    queryFn: () => apiClient<{ data: TaxZone[] }>('/tax/zones'),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; countries: string[]; states: string[] }) =>
      apiClient('/tax/zones', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-zones'] });
      setShowForm(false);
      setFormData({ name: '', countries: '', states: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/tax/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-zones'] }),
  });

  const zones = data?.data ?? [];

  function handleSubmit() {
    createMutation.mutate({
      name: formData.name,
      countries: formData.countries
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
      states: formData.states
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Zones</h1>
          <p className="mt-1 text-muted-foreground">
            Define geographic regions for tax rules (countries and states)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Tax Zone
        </button>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading tax zones...</div>
        )}

        {!isLoading && zones.length === 0 && !showForm && (
          <div className="p-8 text-center text-muted-foreground">
            No tax zones yet. Create zones to define where taxes apply.
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-4">Name</th>
              <th className="p-4">Countries</th>
              <th className="p-4">States</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {showForm && (
              <tr className="border-b">
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Zone name (e.g. Germany)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="DE, AT, CH (comma-separated)"
                    value={formData.countries}
                    onChange={(e) => setFormData({ ...formData, countries: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="DE-BY, US-CA (optional)"
                    value={formData.states}
                    onChange={(e) => setFormData({ ...formData, states: e.target.value })}
                  />
                </td>
                <td className="p-4">—</td>
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
            {zones.map((zone) => (
              <tr key={zone.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {zone.name}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {zone.countries.map((c) => (
                      <span
                        key={c}
                        className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {zone.states.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {zone.states.map((s) => (
                        <span
                          key={s}
                          className="inline-flex rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">All states</span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(zone.id)}
                    className="text-destructive hover:text-destructive/80"
                    title="Delete"
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
