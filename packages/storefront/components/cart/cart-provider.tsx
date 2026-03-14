'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { CartItem } from '@forkcart/shared';

const API_URL = process.env['NEXT_PUBLIC_STOREFRONT_API_URL'] ?? 'http://localhost:4000';

/** Get browser language for Accept-Language header */
function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language || 'en';
}

function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Accept-Language': getBrowserLocale(),
    ...extra,
  };
}

interface ServerCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ServerCartResponse {
  data: {
    id: string;
    items: ServerCartItem[];
    subtotal: number;
    itemCount: number;
  };
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  serverCartId: string | null;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addItem: (
    product: { id: string; name: string; slug: string; price: number; currency?: string },
    quantity?: number,
  ) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('forkcart_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('forkcart_session_id', sid);
  }
  return sid;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [serverCartId, setServerCartId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const initializedRef = useRef(false);

  // Hydrate: load server cart ID from localStorage and fetch cart
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedCartId = localStorage.getItem('forkcart_cart_id');
    if (savedCartId) {
      setServerCartId(savedCartId);
      // Sync from server
      fetch(`${API_URL}/api/v1/carts/${savedCartId}`, { headers: apiHeaders() })
        .then((r) => {
          if (!r.ok) throw new Error('Cart not found');
          return r.json() as Promise<ServerCartResponse>;
        })
        .then((data) => {
          setItems(data.data.items.map(serverItemToCartItem));
        })
        .catch(() => {
          // Cart gone (expired etc.) — clear
          localStorage.removeItem('forkcart_cart_id');
          setServerCartId(null);
          // Fall back to local storage items
          try {
            const saved = localStorage.getItem('forkcart_cart');
            if (saved) setItems(JSON.parse(saved));
          } catch {
            /* ignore */
          }
        });
    } else {
      // No server cart — load from localStorage (backward compat)
      try {
        const saved = localStorage.getItem('forkcart_cart');
        if (saved) setItems(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Persist locally as fallback
  useEffect(() => {
    if (initializedRef.current) {
      localStorage.setItem('forkcart_cart', JSON.stringify(items));
    }
  }, [items]);

  /** Ensure a server-side cart exists, returns cart ID */
  const ensureServerCart = useCallback(async (): Promise<string> => {
    if (serverCartId) return serverCartId;

    const sessionId = getSessionId();
    const res = await fetch(`${API_URL}/api/v1/carts`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sessionId }),
    });

    const data = (await res.json()) as ServerCartResponse;
    const newCartId = data.data.id;
    setServerCartId(newCartId);
    localStorage.setItem('forkcart_cart_id', newCartId);
    return newCartId;
  }, [serverCartId]);

  const addItem = useCallback(
    (
      product: { id: string; name: string; slug: string; price: number; currency?: string },
      quantity = 1,
    ) => {
      // Open cart drawer
      setCartOpen(true);

      // Optimistic local update
      setItems((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  totalPrice: (item.quantity + quantity) * item.unitPrice,
                }
              : item,
          );
        }
        const newItem: CartItem = {
          id: crypto.randomUUID(),
          productId: product.id,
          variantId: null,
          quantity,
          unitPrice: product.price,
          totalPrice: product.price * quantity,
          productName: product.name,
          productSlug: product.slug,
        };
        return [...prev, newItem];
      });

      // Sync to server
      ensureServerCart()
        .then((cartId) => {
          return fetch(`${API_URL}/api/v1/carts/${cartId}/items`, {
            method: 'POST',
            headers: apiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ productId: product.id, quantity }),
          });
        })
        .then((res) => {
          if (!res.ok) return;
          return res.json() as Promise<ServerCartResponse>;
        })
        .then((data) => {
          if (data) {
            // Sync server-side prices (they're authoritative)
            setItems(data.data.items.map(serverItemToCartItem));
          }
        })
        .catch(() => {
          // Server sync failed — local state is still valid
        });
    },
    [ensureServerCart],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
              : item,
          ),
        );
      }

      // Sync to server
      if (serverCartId) {
        const endpoint =
          quantity <= 0
            ? fetch(`${API_URL}/api/v1/carts/${serverCartId}/items/${itemId}`, {
                method: 'DELETE',
                headers: apiHeaders(),
              })
            : fetch(`${API_URL}/api/v1/carts/${serverCartId}/items/${itemId}`, {
                method: 'PUT',
                headers: apiHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ quantity }),
              });

        endpoint
          .then((res) => {
            if (!res.ok) return;
            return res.json() as Promise<ServerCartResponse>;
          })
          .then((data) => {
            if (data) setItems(data.data.items.map(serverItemToCartItem));
          })
          .catch((error: unknown) => {
            console.error('[Cart] Failed to sync cart with server:', error);
          });
      }
    },
    [serverCartId],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      if (serverCartId) {
        fetch(`${API_URL}/api/v1/carts/${serverCartId}/items/${itemId}`, {
          method: 'DELETE',
        }).catch((error: unknown) => {
          // Intentionally silent: item already removed from UI, server sync is best-effort
          console.error('[Cart] Failed to remove item from server cart:', error);
        });
      }
    },
    [serverCartId],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (serverCartId) {
      fetch(`${API_URL}/api/v1/carts/${serverCartId}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      }).catch((error: unknown) => {
        // Intentionally silent: cart already cleared locally, server cleanup is best-effort
        console.error('[Cart] Failed to clear server cart:', error);
      });
    }
    localStorage.removeItem('forkcart_cart_id');
    setServerCartId(null);
  }, [serverCartId]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        serverCartId,
        cartOpen,
        setCartOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

function serverItemToCartItem(item: ServerCartItem): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    productName: item.productName,
    productSlug: item.productSlug,
    productImage: item.productImage ?? undefined,
  };
}
