'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/config';

const TOKEN_KEY = 'forkcart_customer_token';

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketing: boolean;
  orderCount: number;
  totalSpent: number;
}

interface AuthContextValue {
  customer: CustomerProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<CustomerProfile>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<CustomerProfile>;
  logout: () => void;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) => Promise<CustomerProfile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function apiCall<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/customer-auth${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Request failed');
  }

  return data.data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      // Verify token & fetch profile
      apiCall<CustomerProfile>('/me', {}, savedToken)
        .then((profile) => {
          setCustomer(profile);
        })
        .catch(() => {
          // Token invalid — clean up
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<CustomerProfile> => {
    const result = await apiCall<{ customer: CustomerProfile; token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setToken(result.token);
    setCustomer(result.customer);
    localStorage.setItem(TOKEN_KEY, result.token);

    // Try to merge session cart with customer
    try {
      const cartId = localStorage.getItem('forkcart_cart_id');
      if (cartId) {
        await fetch(`${API_URL}/api/v1/carts/${cartId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: result.customer.id }),
        });
      }
    } catch {
      // Cart merge failed — not critical
    }

    return result.customer;
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }): Promise<CustomerProfile> => {
      const result = await apiCall<{ customer: CustomerProfile; token: string }>('/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setToken(result.token);
      setCustomer(result.customer);
      localStorage.setItem(TOKEN_KEY, result.token);

      // Try to merge session cart
      try {
        const cartId = localStorage.getItem('forkcart_cart_id');
        if (cartId) {
          await fetch(`${API_URL}/api/v1/carts/${cartId}/assign`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: result.customer.id }),
          });
        }
      } catch {
        // Cart merge failed — not critical
      }

      return result.customer;
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const updateProfile = useCallback(
    async (data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }): Promise<CustomerProfile> => {
      const profile = await apiCall<CustomerProfile>(
        '/me',
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        token,
      );
      setCustomer(profile);
      return profile;
    },
    [token],
  );

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await apiCall<CustomerProfile>('/me', {}, token);
      setCustomer(profile);
    } catch {
      // Token may have expired
      logout();
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
