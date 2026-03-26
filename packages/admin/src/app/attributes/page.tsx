'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  values: string[];
  sortOrder: number;
  createdAt: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AttributesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', type: 'text', values: '' });

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const res = await apiClient<{ data: Attribute[] }>('/attributes');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient('/attributes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient(`/attributes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/attributes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributes'] }),
  });

  function resetForm() {
    setFormData({ name: '', slug: '', type: 'text', values: '' });
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(attr: Attribute) {
    setEditingId(attr.id);
    setFormData({
      name: attr.name,
      slug: attr.slug,
      type: attr.type,
      values: (attr.values as string[]).join(', '),
    });
    setShowForm(true);
  }

  function handleSubmit() {
    const payload = {
      name: formData.name,
      slug: formData.slug || slugify(formData.name),
      type: formData.type,
      values: formData.values
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attributes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define product attributes like Size, Color, Material for variant generation.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              New Attribute
            </>
          )}
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">
            {editingId ? 'Edit Attribute' : 'New Attribute'}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="attr-name">Name</Label>
              <Input
                id="attr-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData((p) => ({
                    ...p,
                    name: e.target.value,
                    slug: editingId ? p.slug : slugify(e.target.value),
                  }));
                }}
                placeholder="e.g. Size"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="attr-slug">Slug</Label>
              <Input
                id="attr-slug"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. size"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="attr-values">Values (comma-separated)</Label>
              <Input
                id="attr-values"
                value={formData.values}
                onChange={(e) => setFormData((p) => ({ ...p, values: e.target.value }))}
                placeholder="e.g. S, M, L, XL"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                These values will be available when generating variants.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attribute List */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading attributes...</p>
      ) : attributes.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No attributes defined yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create attributes like &quot;Size&quot; or &quot;Color&quot; to generate product
            variants.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attr) => (
            <div key={attr.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{attr.name}</h3>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {attr.slug}
                    </span>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
                      {attr.type}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(attr.values as string[]).map((val) => (
                      <span
                        key={val}
                        className="inline-flex rounded-md border bg-background px-2.5 py-1 text-sm"
                      >
                        {val}
                      </span>
                    ))}
                    {(attr.values as string[]).length === 0 && (
                      <span className="text-sm text-muted-foreground">No values defined</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(attr)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete attribute "${attr.name}"?`)) {
                        deleteMutation.mutate(attr.id);
                      }
                    }}
                    className="rounded-md p-2 text-red-500 hover:bg-red-50"
                    title="Delete"
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
  );
}
