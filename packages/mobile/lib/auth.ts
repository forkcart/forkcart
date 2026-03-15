import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  login as apiLogin,
  register as apiRegister,
  getCustomer,
  setToken,
  clearToken,
  type Customer,
} from './api';

const TOKEN_KEY = 'forkcart_auth_token';

interface AuthState {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  customer: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          const me = await getCustomer();
          setCustomer(me);
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    await setToken(res.token);
    setCustomer(res.customer);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const res = await apiRegister(data);
      await setToken(res.token);
      setCustomer(res.customer);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearToken();
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      isLoading,
      isAuthenticated: !!customer,
      login,
      register,
      logout,
    }),
    [customer, isLoading, login, register, logout],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
