import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const TOKEN_KEY = 'forkcart_auth_token';

// ── Types ──────────────────────────────────────────────

export interface ApiImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ProductVariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  options: ProductVariantOption[];
  image?: ApiImage;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  images: ApiImage[];
  thumbnail?: string;
  category?: Category;
  categoryId?: string;
  variants: ProductVariant[];
  averageRating?: number;
  reviewCount?: number;
  inStock: boolean;
  tags?: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  variant?: ProductVariantOption[];
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  itemCount: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: CartItem[];
  shippingAddress: Address;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthResponse {
  token: string;
  customer: Customer;
}

// ── API Client ─────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${config.apiUrl}${path}`;
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, text);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ── Endpoint Helpers ───────────────────────────────────

export function getProducts(params?: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  search?: string;
  sort?: string;
}): Promise<PaginatedResponse<Product>> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  if (params?.search) q.set('search', params.search);
  if (params?.sort) q.set('sort', params.sort);
  const qs = q.toString();
  return api.get(`/api/v1/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(slug: string): Promise<Product> {
  return api.get(`/api/v1/products/${slug}`);
}

export function getCategories(): Promise<Category[]> {
  return api.get('/api/v1/categories');
}

export function getCategory(id: string): Promise<Category> {
  return api.get(`/api/v1/categories/${id}`);
}

export function getProductReviews(productId: string, page = 1): Promise<PaginatedResponse<Review>> {
  return api.get(`/api/v1/products/${productId}/reviews?page=${page}`);
}

export function getRelatedProducts(productId: string): Promise<Product[]> {
  return api.get(`/api/v1/products/${productId}/related`);
}

// Cart
export function getCart(): Promise<Cart> {
  return api.get('/api/v1/cart');
}

export function addToCart(productId: string, quantity: number, variantId?: string): Promise<Cart> {
  return api.post('/api/v1/cart/items', { productId, quantity, variantId });
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return api.patch(`/api/v1/cart/items/${itemId}`, { quantity });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return api.delete(`/api/v1/cart/items/${itemId}`);
}

export function applyCoupon(code: string): Promise<Cart> {
  return api.post('/api/v1/cart/coupon', { code });
}

export function removeCoupon(): Promise<Cart> {
  return api.delete('/api/v1/cart/coupon');
}

// Auth
export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post('/api/v1/customer-auth/login', { email, password });
}

export function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  return api.post('/api/v1/customer-auth/register', data);
}

export function getCustomer(): Promise<Customer> {
  return api.get('/api/v1/customer/me');
}

// Orders
export function getOrders(page = 1): Promise<PaginatedResponse<Order>> {
  return api.get(`/api/v1/orders?page=${page}`);
}

export function getOrder(id: string): Promise<Order> {
  return api.get(`/api/v1/orders/${id}`);
}

export function createOrder(data: {
  shippingAddress: Address;
  paymentMethod: string;
}): Promise<Order> {
  return api.post('/api/v1/orders', data);
}

// Wishlist
export function getWishlist(): Promise<WishlistItem[]> {
  return api.get('/api/v1/wishlist');
}

export function addToWishlist(productId: string): Promise<void> {
  return api.post('/api/v1/wishlist', { productId });
}

export function removeFromWishlist(productId: string): Promise<void> {
  return api.delete(`/api/v1/wishlist/${productId}`);
}

// Search
export function searchProducts(query: string): Promise<Product[]> {
  return api.get(`/api/v1/search?q=${encodeURIComponent(query)}`);
}
