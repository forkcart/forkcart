'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export interface PreviewProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  sku?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  images?: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
}

let cachedProduct: PreviewProduct | null = null;

/**
 * Fetches a sample product for Page Builder preview.
 * Cached across all block instances to avoid redundant API calls.
 */
export function usePreviewProduct(): PreviewProduct | null {
  const [product, setProduct] = useState<PreviewProduct | null>(cachedProduct);

  useEffect(() => {
    if (cachedProduct) {
      setProduct(cachedProduct);
      return;
    }

    const token = getToken();
    fetch(`${API_BASE_URL}/api/v1/products?limit=1&status=active`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { data?: PreviewProduct[] }) => {
        const p = data.data?.[0] ?? null;
        if (p) {
          // Prices come in cents from API
          cachedProduct = p;
          setProduct(p);
        }
      })
      .catch(() => {});
  }, []);

  return product;
}
