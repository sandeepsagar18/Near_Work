import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  addresses?: any[];
}

interface AuthContextType {
  user: CustomerUser | null;
  selectedAddress: any | null;
  setSelectedAddress: (addr: any) => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const res = await ApiClient.request('/customer/profile');
      if (res.success && res.data) {
        setUser(res.data);
        if (res.data.addresses && res.data.addresses.length > 0) {
          const defaultAddr = res.data.addresses.find((a: any) => a.isDefault) || res.data.addresses[0];
          setSelectedAddress(defaultAddr);
        }
        connectSocket();
      } else {
        setUser(null);
        ApiClient.clearTokens();
        disconnectSocket();
      }
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ApiClient.getAccessToken()) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const res = await ApiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password: password.trim() })
    });

    if (res.success && res.data?.tokens) {
      ApiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      if (res.data.user) {
        setUser(res.data.user);
      }
      refreshProfile().catch(() => {});
      return true;
    }
    return false;
  };

  const register = async (data: any): Promise<boolean> => {
    const res = await ApiClient.request('/auth/register/customer', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res.success && res.data?.tokens) {
      ApiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await refreshProfile();
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await ApiClient.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    ApiClient.clearTokens();
    setUser(null);
    setSelectedAddress(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedAddress,
        setSelectedAddress,
        isLoading,
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
