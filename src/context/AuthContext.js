import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuthSession, getStoredToken, getStoredUser, saveAuthSession } from '../utils/auth';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data.user);
      } catch {
        clearAuthSession();
        setUser(null);
        setToken(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const login = ({ token: nextToken, user: nextUser }) => {
    saveAuthSession({ token: nextToken, user: nextUser });
    setToken(nextToken);
    setUser(nextUser);
  };

  const updateUser = useCallback((nextUser) => {
    saveAuthSession({ token, user: nextUser });
    setUser(nextUser);
  }, [token]);

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isAuthLoading,
    login,
    updateUser,
    logout,
  }), [user, token, isAuthLoading, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
