import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, getAuthUser, setAuthSession, clearAuthSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const handleLogin = async (username, password) => {
    const res = await api.login(username, password);
    const receivedToken = res.token || res.data?.token;
    const receivedUser = res.user || res.data?.user;

    if (receivedToken) {
      setToken(receivedToken);
      if (receivedUser) {
        setUser(receivedUser);
      }
      setAuthSession(receivedToken, receivedUser || null);

      // Verify token with PMS backend and fetch complete user profile
      try {
        const meRes = await api.getCurrentUser();
        if (meRes.success && meRes.user) {
          setUser(meRes.user);
          setAuthSession(receivedToken, meRes.user);
        }
      } catch (err) {
        console.warn('PMS session sync note:', err.message);
      }

      return res;
    }
    throw new Error(res.message || 'Login failed. Invalid response from authentication service.');
  };

  const handleLogout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Validate current session against DB on mount
    async function verifySession() {
      if (token) {
        try {
          const res = await api.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
            setAuthSession(token, res.user);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.warn('Session verification failed, clearing session:', err.message);
          handleLogout();
        }
      }
      setIsLoading(false);
    }
    verifySession();
  }, [token]);

  const roleId = user ? user.role_id : null;
  const isAdmin = roleId === 1;
  const isManagerOrTL = roleId === 2 || roleId === 3;
  const isEmployee = roleId === 4;
  const canManageReviews = isAdmin || isManagerOrTL;

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    roleId,
    isAdmin,
    isManagerOrTL,
    isEmployee,
    canManageReviews,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
