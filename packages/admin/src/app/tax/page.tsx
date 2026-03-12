'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TaxClass {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function TaxClassesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', isDefault: false });

  const { data, isLoading } = useQuery({
    queryKey: ['tax-classes'],
    queryFn: () => apiClient<{ data: TaxClass[] }>('/tax/classes'),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string; isDefault: boolean }) =>
      apiClient('/tax/classes', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-classes'] });
      setShowForm(false);
      setFormData({ name: '', description: '', isDefault: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/tax/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-classes'] }),
  });

  const classes = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Classes</h1>
          <p className="mt-1 text-muted-foreground">
            Define tax categories for your products (e.g. Standard, Reduced, Zero-rated)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Tax Class
        </button>
      </div>

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading tax classes...</div>
        )}

        {!isLoading && classes.length === 0 && !showForm && (
          <div className="p-8 text-center text-muted-foreground">
            No tax classes yet. Create your first one to get started.
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="p-4">Name</th>
              <th className="p-4">Description</th>
              <th className="p-4">Default</th>
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
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                </td>
                <td className="p-4">—</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => createMutation.mutate(formData)}
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
            {classes.map((cls) => (
              <tr key={cls.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{cls.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{cls.description ?? '—'}</td>
                <td className="p-4">
                  {cls.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Default
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      cls.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cls.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(cls.id)}
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
