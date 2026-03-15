'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, Wand2, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Variant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number | null;
  inventoryQuantity: number;
  attributes: Record<string, string>;
  sortOrder: number;
}

interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  values: string[];
  sortOrder: number;
}

function centsToDisplay(cents: number | null): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number | null {
  if (!display.trim()) return null;
  const val = parseFloat(display.replace(',', '.'));
  return isNaN(val) ? null : Math.round(val * 100);
}

export function ProductVariants({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    sku: string;
    price: string;
    inventoryQuantity: string;
  }>({ name: '', sku: '', price: '', inventoryQuantity: '0' });

  const [newVariant, setNewVariant] = useState<{
    name: string;
    sku: string;
    price: string;
    inventoryQuantity: string;
  } | null>(null);

  const { data: variantsData, isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => apiClient<{ data: Variant[] }>(`/products/${productId}/variants`),
  });

  const { data: attributesData } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => apiClient<{ data: Attribute[] }>('/attributes'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient(`/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      setNewVariant(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: Record<string, unknown> }) =>
      apiClient(`/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) =>
      apiClient(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (selections: Array<{ name: string; values: string[] }>) =>
      apiClient(`/products/${productId}/variants/generate`, {
        method: 'POST',
        body: JSON.stringify({ attributeSelections: selections }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      setShowGenerator(false);
    },
  });

  const variants = variantsData?.data ?? [];
  const attributes = attributesData?.data ?? [];

  function startEdit(v: Variant) {
    setEditingId(v.id);
    setEditValues({
      name: v.name,
      sku: v.sku ?? '',
      price: centsToDisplay(v.price),
      inventoryQuantity: String(v.inventoryQuantity),
    });
  }

  function saveEdit(variantId: string) {
    updateMutation.mutate({
      variantId,
      data: {
        name: editValues.name,
        sku: editValues.sku || null,
        price: displayToCents(editValues.price),
        inventoryQuantity: parseInt(editValues.inventoryQuantity) || 0,
      },
    });
  }

  function saveNew() {
    if (!newVariant?.name) return;
    createMutation.mutate({
      name: newVariant.name,
      sku: newVariant.sku || null,
      price: displayToCents(newVariant.price),
      inventoryQuantity: parseInt(newVariant.inventoryQuantity) || 0,
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Variants</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product variants (size, color, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          {attributes.length > 0 && (
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Generate
            </button>
          )}
          <button
            onClick={() => setNewVariant({ name: '', sku: '', price: '', inventoryQuantity: '0' })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variant
          </button>
        </div>
      </div>

      {/* Generator Panel */}
      {showGenerator && (
        <VariantGenerator
          attributes={attributes}
          onGenerate={(selections) => generateMutation.mutate(selections)}
          isPending={generateMutation.isPending}
          onClose={() => setShowGenerator(false)}
        />
      )}

      {isLoading ? (
        <div className="mt-4 text-sm text-muted-foreground">Loading variants...</div>
      ) : variants.length === 0 && !newVariant ? (
        <div className="mt-4 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No variants yet. Add one manually or generate from attributes.
        </div>
      ) : (
        <div className="mt-4">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_100px_80px_60px] gap-3 border-b pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>SKU</span>
            <span>Price</span>
            <span>Stock</span>
            <span />
          </div>

          {/* Variant Rows */}
          {variants.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[1fr_120px_100px_80px_60px] items-center gap-3 border-b py-2"
            >
              {editingId === v.id ? (
                <>
                  <input
                    value={editValues.name}
                    onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))}
                    className="h-8 rounded-md border px-2 text-sm"
                  />
                  <input
                    value={editValues.sku}
                    onChange={(e) => setEditValues((p) => ({ ...p, sku: e.target.value }))}
                    className="h-8 rounded-md border px-2 text-sm"
                    placeholder="—"
                  />
                  <input
                    value={editValues.price}
                    onChange={(e) => setEditValues((p) => ({ ...p, price: e.target.value }))}
                    className="h-8 rounded-md border px-2 text-sm"
                    placeholder="inherit"
                  />
                  <input
                    value={editValues.inventoryQuantity}
                    onChange={(e) =>
                      setEditValues((p) => ({ ...p, inventoryQuantity: e.target.value }))
                    }
                    className="h-8 rounded-md border px-2 text-sm"
                    type="number"
                    min="0"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(v.id)}
                      disabled={updateMutation.isPending}
                      className="rounded p-1 text-green-600 hover:bg-green-50"
                      title="Save"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(v)}
                    className="truncate text-left text-sm hover:text-primary"
                    title="Click to edit"
                  >
                    {v.name}
                    {Object.keys(v.attributes).length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (
                        {Object.entries(v.attributes)
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </button>
                  <span className="truncate text-sm text-muted-foreground">{v.sku ?? '—'}</span>
                  <span className="text-sm">
                    {v.price !== null ? (
                      `${centsToDisplay(v.price)}`
                    ) : (
                      <span className="text-muted-foreground">inherit</span>
                    )}
                  </span>
                  <span
                    className={`text-sm ${v.inventoryQuantity === 0 ? 'text-red-500 font-medium' : ''}`}
                  >
                    {v.inventoryQuantity}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (confirm(`Delete variant "${v.name}"?`)) deleteMutation.mutate(v.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* New Variant Row */}
          {newVariant && (
            <div className="grid grid-cols-[1fr_120px_100px_80px_60px] items-center gap-3 border-b border-dashed py-2">
              <input
                value={newVariant.name}
                onChange={(e) => setNewVariant((p) => (p ? { ...p, name: e.target.value } : p))}
                className="h-8 rounded-md border px-2 text-sm"
                placeholder="Variant name"
                autoFocus
              />
              <input
                value={newVariant.sku}
                onChange={(e) => setNewVariant((p) => (p ? { ...p, sku: e.target.value } : p))}
                className="h-8 rounded-md border px-2 text-sm"
                placeholder="SKU"
              />
              <input
                value={newVariant.price}
                onChange={(e) => setNewVariant((p) => (p ? { ...p, price: e.target.value } : p))}
                className="h-8 rounded-md border px-2 text-sm"
                placeholder="inherit"
              />
              <input
                value={newVariant.inventoryQuantity}
                onChange={(e) =>
                  setNewVariant((p) => (p ? { ...p, inventoryQuantity: e.target.value } : p))
                }
                className="h-8 rounded-md border px-2 text-sm"
                type="number"
                min="0"
              />
              <div className="flex gap-1">
                <button
                  onClick={saveNew}
                  disabled={createMutation.isPending || !newVariant.name}
                  className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setNewVariant(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Generator panel — select attributes and generate variant combinations */
function VariantGenerator({
  attributes,
  onGenerate,
  isPending,
  onClose,
}: {
  attributes: Attribute[];
  onGenerate: (selections: Array<{ name: string; values: string[] }>) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggleValue(attrName: string, value: string) {
    setSelections((prev) => {
      const current = prev[attrName] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const { [attrName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [attrName]: next };
    });
  }

  const activeSelections = Object.entries(selections)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => ({ name, values }));

  const comboCount = activeSelections.reduce(
    (acc, s) => acc * s.values.length,
    activeSelections.length > 0 ? 1 : 0,
  );

  return (
    <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Generate Variants from Attributes</h4>
        <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No attributes defined. Create attributes first under Settings → Attributes.
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {attributes.map((attr) => (
              <div key={attr.id}>
                <label className="text-xs font-medium text-muted-foreground">{attr.name}</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(attr.values as string[]).map((val) => {
                    const selected = selections[attr.name]?.includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => toggleValue(attr.name, val)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {comboCount > 0
                ? `${comboCount} variant(s) will be generated`
                : 'Select attribute values'}
            </span>
            <button
              onClick={() => onGenerate(activeSelections)}
              disabled={isPending || comboCount === 0}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Generating...' : `Generate ${comboCount} Variants`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
