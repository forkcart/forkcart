import type { Product, Category, Cart, PaginatedResponse, ApiResponse } from '@forkcart/shared';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

/** Get browser locale for Accept-Language header */
function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language?.split('-')[0] || 'en';
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': getBrowserLocale(),
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
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.search) query.set('search', params.search);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDirection) query.set('sortDirection', params.sortDirection);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params?.status) query.set('status', params.status);

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

export interface CategoryWithCount extends Category {
  productCount: number;
}

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const res = await fetchApi<ApiResponse<CategoryWithCount[]>>('/categories?withCounts=true');
  return res.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const res = await fetchApi<ApiResponse<Category>>(`/categories/${slug}`);
  return res.data;
}

export async function searchProducts(
  query: string,
  options?: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    sort?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{
  data: Product[];
  pagination: { total: number; limit: number; offset: number; totalPages: number };
  meta: { query: string; mode: string; suggestions?: string[] };
}> {
  const params = new URLSearchParams({ q: query });
  if (options?.category) params.set('category', options.category);
  if (options?.priceMin !== undefined) params.set('priceMin', String(options.priceMin));
  if (options?.priceMax !== undefined) params.set('priceMax', String(options.priceMax));
  if (options?.sort) params.set('sort', options.sort);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));

  return fetchApi(`/search?${params.toString()}`);
}

export async function getSearchSuggestions(query: string): Promise<{ data: string[] }> {
  return fetchApi(`/search/suggestions?q=${encodeURIComponent(query)}`);
}

export async function getPopularSearches(): Promise<{
  data: Array<{ query: string; searchCount: number }>;
}> {
  return fetchApi('/search/popular');
}

/** Instant search result for overlay */
export interface InstantSearchItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  imageUrl: string | null;
  hasDiscount: boolean;
}

/** Trending product */
export interface TrendingProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  inventoryQuantity: number;
  imageUrl: string | null;
  trendScore: number;
}

/** Public search API — instant search for overlay */
export async function instantSearch(
  query: string,
  locale?: string,
): Promise<{ data: InstantSearchItem[] }> {
  const langHeader =
    locale || (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'en') || 'en';
  const res = await fetch(
    `${API_URL}/api/v1/public/search/instant?q=${encodeURIComponent(query)}`,
    {
      next: { revalidate: 0 },
      headers: { 'Accept-Language': langHeader },
    },
  );
  if (!res.ok) return { data: [] };
  return res.json() as Promise<{ data: InstantSearchItem[] }>;
}

/** Public search API — popular search terms */
export async function getPublicPopularSearches(): Promise<{
  data: Array<{ query: string; searchCount: number }>;
}> {
  const res = await fetch(`${API_URL}/api/v1/public/search/popular`, { next: { revalidate: 60 } });
  if (!res.ok) return { data: [] };
  return res.json() as Promise<{ data: Array<{ query: string; searchCount: number }> }>;
}

/** Public search API — trending products */
export async function getTrendingProducts(
  locale?: string,
): Promise<{ data: TrendingProductItem[] }> {
  const lang = locale || getBrowserLocale();
  const res = await fetch(`${API_URL}/api/v1/public/search/trending`, {
    next: { revalidate: 60 },
    headers: { 'Accept-Language': lang },
  });
  if (!res.ok) return { data: [] };
  return res.json() as Promise<{ data: TrendingProductItem[] }>;
}

/** Public search API — track impressions */
export async function trackImpression(params: {
  productId: string;
  eventType: 'view' | 'click' | 'cart_add';
  sessionId?: string;
  query?: string;
}): Promise<void> {
  fetch(`${API_URL}/api/v1/public/search/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch((error: unknown) => {
    // Intentionally silent: search tracking is analytics, should not break UX
    console.error('[API] Failed to track search event:', error);
  });
}

// Page types
export interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  content: unknown;
  pageType: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  isHomepage: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getPage(slug: string): Promise<Page> {
  const res = await fetchApi<ApiResponse<Page>>(`/pages/${slug}`);
  return res.data;
}

export async function getHomepage(): Promise<Page | null> {
  const res = await fetchApi<ApiResponse<Page | null>>('/pages/homepage');
  return res.data;
}

export async function getPageByType(pageType: string): Promise<Page | null> {
  try {
    const res = await fetchApi<ApiResponse<Page | null>>(`/pages/by-type/${pageType}`);
    return res.data;
  } catch {
    return null;
  }
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
