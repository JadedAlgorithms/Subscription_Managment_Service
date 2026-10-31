import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, UserSafe } from '../types';

interface AuthContextType {
  user: UserSafe | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserSafe>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
  }) => Promise<UserSafe>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSafe | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('brightloop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const json = await response.json();
        setUser(json.data);
      } else {
        // Token expired or invalid
        localStorage.removeItem('brightloop_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate token with server:', err);
      localStorage.removeItem('brightloop_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<UserSafe> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Login failed.');
      }

      const { user: userData, token: authToken } = json.data;
      localStorage.setItem('brightloop_token', authToken);
      setToken(authToken);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
  }): Promise<UserSafe> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Registration failed.');
      }

      const { user: userData, token: authToken } = json.data;
      localStorage.setItem('brightloop_token', authToken);
      setToken(authToken);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('brightloop_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isStaff = user?.role === UserRole.STAFF || user?.role === UserRole.ADMIN;
  const isCustomer = user?.role === UserRole.CUSTOMER;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAdmin,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

