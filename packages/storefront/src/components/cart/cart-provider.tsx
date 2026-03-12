'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { CartItem } from '@forkcart/shared';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: { id: string; name: string; slug: string; price: number; currency?: string }, quantity?: number) => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('forkcart_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem('forkcart_cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (product: { id: string; name: string; slug: string; price: number; currency?: string }, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + quantity, totalPrice: (item.quantity + quantity) * item.unitPrice }
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
    },
    [],
  );

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity, totalPrice: item.unitPrice * quantity } : item,
        ),
      );
    }
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
