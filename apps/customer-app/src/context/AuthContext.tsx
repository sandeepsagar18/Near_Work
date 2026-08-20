import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { detectCurrentLocation } from '../services/location';

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
  acquireLiveGPSLocation: () => Promise<any>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [selectedAddress, setSelectedAddressState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('nw_user_live_address');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSelectedAddress = (addr: any) => {
    setSelectedAddressState(addr);
    try {
      if (addr) {
        localStorage.setItem('nw_user_live_address', JSON.stringify(addr));
      } else {
        localStorage.removeItem('nw_user_live_address');
      }
    } catch {}
  };

  const acquireLiveGPSLocation = async () => {
    try {
      const liveLoc = await detectCurrentLocation();
      const newAddress = {
        id: 'gps-live-' + Date.now(),
        label: 'Current Live GPS Location',
        addressLine: liveLoc.addressLine,
        city: liveLoc.city,
        state: liveLoc.state,
        pincode: liveLoc.pincode,
        latitude: liveLoc.latitude,
        longitude: liveLoc.longitude,
        isDefault: true
      };
      setSelectedAddress(newAddress);

      // Auto-sync real GPS location to MongoDB database
      if (ApiClient.getAccessToken()) {
        ApiClient.request('/customer/live-location', {
          method: 'POST',
          body: JSON.stringify({
            latitude: liveLoc.latitude,
            longitude: liveLoc.longitude,
            addressLine: liveLoc.addressLine,
            city: liveLoc.city,
            state: liveLoc.state,
            pincode: liveLoc.pincode,
            label: 'Current Live GPS Location'
          })
        }).catch(() => {});
      }

      return newAddress;
    } catch (e) {
      console.warn('Auto GPS location detection:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await ApiClient.request('/customer/profile');
      if (res.success && res.data) {
        setUser(res.data);
        
        // If no real GPS address was detected yet, trigger GPS acquisition
        const savedLive = localStorage.getItem('nw_user_live_address');
        if (!savedLive) {
          acquireLiveGPSLocation().then((loc) => {
            if (!loc && res.data.addresses && res.data.addresses.length > 0) {
              const defaultAddr = res.data.addresses.find((a: any) => a.isDefault) || res.data.addresses[0];
              setSelectedAddress(defaultAddr);
            }
          });
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
      // Auto-prompt location for guest customers as well
      const savedLive = localStorage.getItem('nw_user_live_address');
      if (!savedLive) {
        acquireLiveGPSLocation();
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await ApiClient.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      if (res.success && res.data?.tokens) {
        ApiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        if (res.data.user) {
          setUser(res.data.user);
        }
        // Acquire real live GPS on login
        acquireLiveGPSLocation();
        refreshProfile().catch(() => {});
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid email or password' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection error. Please try again.' };
    }
  };

  const register = async (data: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await ApiClient.request('/auth/register/customer', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (res.success && res.data?.tokens) {
        ApiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        acquireLiveGPSLocation();
        await refreshProfile();
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration error' };
    }
  };

  const logout = () => {
    setUser(null);
    ApiClient.clearTokens();
    disconnectSocket();
    localStorage.removeItem('nw_user_live_address');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedAddress,
        setSelectedAddress,
        acquireLiveGPSLocation,
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
