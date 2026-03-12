import type { Product, Category, Cart, PaginatedResponse, ApiResponse } from '@forkcart/shared';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function getProducts(params?: {
  categoryId?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDirection) query.set('sortDirection', params.sortDirection);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  return fetchApi<PaginatedResponse<Product>>(`/products${qs ? `?${qs}` : ''}`);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  const res = await fetchApi<ApiResponse<Product>>(`/products/${slug}`);
  return res.data;
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetchApi<ApiResponse<Category[]>>('/categories');
  return res.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const res = await fetchApi<ApiResponse<Category>>(`/categories/${slug}`);
  return res.data;
}

export async function searchProducts(query: string): Promise<PaginatedResponse<Product>> {
  return getProducts({ search: query, limit: 20 });
}

// Cart operations (client-side)
export async function getCart(sessionId: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/api/v1/cart`, {
    headers: { 'X-Session-Id': sessionId },
  });
  return res.json() as Promise<Cart>;
}

export async function addToCart(
  sessionId: string,
  productId: string,
  quantity: number,
): Promise<Cart> {
  const res = await fetch(`${API_URL}/api/v1/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ productId, quantity }),
  });
  return res.json() as Promise<Cart>;
}

export async function updateCartItem(
  sessionId: string,
  itemId: string,
  quantity: number,
): Promise<Cart> {
  const res = await fetch(`${API_URL}/api/v1/cart/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ quantity }),
  });
  return res.json() as Promise<Cart>;
}

export async function removeCartItem(sessionId: string, itemId: string): Promise<Cart> {
  const res = await fetch(`${API_URL}/api/v1/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'X-Session-Id': sessionId },
  });
  return res.json() as Promise<Cart>;
}
