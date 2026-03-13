'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from './api-client';
import { getToken, removeToken } from './auth';

export type AdminRole = 'superadmin' | 'admin' | 'editor';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Check if user has one of the given roles */
  hasRole: (...roles: AdminRole[]) => boolean;
  /** Refresh user data from API */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  hasRole: () => false,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const result = await apiClient<{ data: { user: AuthUser } }>('/auth/me');
      setUser(result.data.user);
    } catch {
      setUser(null);
      removeToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const hasRole = useCallback(
    (...roles: AdminRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, hasRole, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
