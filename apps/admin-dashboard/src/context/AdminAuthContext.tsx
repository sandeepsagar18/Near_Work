import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminApiClient } from '../services/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  adminProfile?: any;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const res = await AdminApiClient.request('/auth/me');
      if (res.success && res.data && res.data.role === 'ADMIN') {
        setAdmin(res.data);
      } else {
        setAdmin(null);
        AdminApiClient.clearTokens();
      }
    } catch (e) {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (AdminApiClient.getAccessToken()) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await AdminApiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: password.trim(), role: 'ADMIN' })
      });

      if (res.success && res.data?.tokens) {
        AdminApiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        setAdmin(res.data.user);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    AdminApiClient.clearTokens();
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
