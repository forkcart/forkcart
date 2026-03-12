'use client';

import { useState } from 'react';
import { slugify } from '@forkcart/shared';
import type { Product } from '@forkcart/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ProductAIButtons } from './product-ai';

interface ProductFormProps {
  initialData?: Product;
  productId?: string;
  onSubmit: (values: Record<string, unknown>) => void;
  isSubmitting: boolean;
}

export function ProductForm({ initialData, productId, onSubmit, isSubmitting }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? '');
  const [sku, setSku] = useState(initialData?.sku ?? '');
  const [status, setStatus] = useState(initialData?.status ?? 'draft');
  const [price, setPrice] = useState(initialData ? (initialData.price / 100).toFixed(2) : '');
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialData?.compareAtPrice ? (initialData.compareAtPrice / 100).toFixed(2) : '',
  );
  const [inventoryQuantity, setInventoryQuantity] = useState(
    String(initialData?.inventoryQuantity ?? 0),
  );
  const [autoSlug, setAutoSlug] = useState(!initialData);
  const [metaTitle, setMetaTitle] = useState(
    ((initialData as Record<string, unknown>)?.metaTitle as string) ?? '',
  );
  const [metaDescription, setMetaDescription] = useState(
    ((initialData as Record<string, unknown>)?.metaDescription as string) ?? '',
  );
  const [metaKeywords, setMetaKeywords] = useState(
    ((initialData as Record<string, unknown>)?.metaKeywords as string) ?? '',
  );

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      description: description || undefined,
      shortDescription: shortDescription || undefined,
      sku: sku || undefined,
      status,
      price: Math.round(parseFloat(price || '0') * 100),
      compareAtPrice: compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : undefined,
      inventoryQuantity: parseInt(inventoryQuantity, 10) || 0,
      currency: 'EUR',
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      metaKeywords: metaKeywords || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">General</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Product name"
              required
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              placeholder="product-slug"
              required
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="shortDescription">Short Description</Label>
            <Input
              id="shortDescription"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief product summary"
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full product description"
              rows={5}
              className="mt-1.5"
            />
            {productId && (
              <div className="mt-2">
                <ProductAIButtons
                  productId={productId}
                  currentDescription={description || undefined}
                  onDescriptionGenerated={(d) => setDescription(d)}
                  onSEOGenerated={(seo) => {
                    if (seo.title) setMetaTitle(seo.title);
                    if (seo.description) setMetaDescription(seo.description);
                    if (seo.keywords)
                      setMetaKeywords(
                        Array.isArray(seo.keywords)
                          ? seo.keywords.join(', ')
                          : String(seo.keywords),
                      );
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Pricing & Inventory</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="price">Price (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="compareAtPrice">Compare-at Price (€)</Label>
            <Input
              id="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="0.00"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="inventoryQuantity">Inventory</Label>
            <Input
              id="inventoryQuantity"
              type="number"
              min="0"
              value={inventoryQuantity}
              onChange={(e) => setInventoryQuantity(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">SEO</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Search engine optimization. Use the ✨ AI buttons above to auto-generate.
        </p>
        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="metaTitle">
              Meta Title{' '}
              <span className="text-xs text-muted-foreground">({metaTitle.length}/60)</span>
            </Label>
            <Input
              id="metaTitle"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="SEO page title"
              maxLength={60}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="metaDescription">
              Meta Description{' '}
              <span className="text-xs text-muted-foreground">({metaDescription.length}/160)</span>
            </Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO page description"
              maxLength={160}
              rows={2}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="metaKeywords">Meta Keywords</Label>
            <Input
              id="metaKeywords"
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Organization</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU-001"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
              className="mt-1.5"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
