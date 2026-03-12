'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Category } from '@forkcart/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@forkcart/shared';
import { Badge } from '@/components/ui/badge';

function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Category;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [autoSlug, setAutoSlug] = useState(!initial);

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) setSlug(slugify(val));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, slug, description: description || undefined, isActive: true });
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="cat-slug">Slug</Label>
        <Input
          id="cat-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setAutoSlug(false);
          }}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="cat-desc">Description</Label>
        <Textarea
          id="cat-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1.5"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient<{ data: Category[] }>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiClient('/categories', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) =>
      apiClient(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="mt-1 text-muted-foreground">Organize your product catalog</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {(showForm || editing) && (
        <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? 'Edit Category' : 'New Category'}
          </h2>
          <CategoryForm
            initial={editing ?? undefined}
            onSubmit={(values) =>
              editing
                ? updateMutation.mutate({ id: editing.id, values })
                : createMutation.mutate(values)
            }
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-card shadow-sm">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Loading categories…</div>
        )}
        {error && (
          <div className="p-8 text-center text-destructive">Failed to load categories.</div>
        )}
        {data && data.data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No categories yet.</div>
        )}
        {data && data.data.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Slug</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((cat) => (
                <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{cat.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{cat.slug}</td>
                  <td className="p-4">
                    <Badge variant={cat.isActive ? 'success' : 'outline'}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(cat);
                          setShowForm(false);
                        }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(cat.id)}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
