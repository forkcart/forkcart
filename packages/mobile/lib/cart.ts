import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  getCart as fetchCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  applyCoupon as apiApplyCoupon,
  removeCoupon as apiRemoveCoupon,
  type Cart,
} from './api';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartState>({
  cart: null,
  isLoading: false,
  refresh: async () => {},
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  applyCoupon: async () => {},
  removeCoupon: async () => {},
  itemCount: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCart();
      setCart(data);
    } catch {
      // Cart might not exist yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(async (productId: string, quantity: number, variantId?: string) => {
    const data = await apiAddToCart(productId, quantity, variantId);
    setCart(data);
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const data = await apiUpdateCartItem(itemId, quantity);
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const data = await apiRemoveCartItem(itemId);
    setCart(data);
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    const data = await apiApplyCoupon(code);
    setCart(data);
  }, []);

  const removeCoupon = useCallback(async () => {
    const data = await apiRemoveCoupon();
    setCart(data);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      refresh,
      addItem,
      updateItem,
      removeItem,
      applyCoupon,
      removeCoupon,
      itemCount: cart?.itemCount ?? 0,
    }),
    [cart, isLoading, refresh, addItem, updateItem, removeItem, applyCoupon, removeCoupon],
  );

  return React.createElement(CartContext.Provider, { value }, children);
}

export function useCart(): CartState {
  return useContext(CartContext);
}
