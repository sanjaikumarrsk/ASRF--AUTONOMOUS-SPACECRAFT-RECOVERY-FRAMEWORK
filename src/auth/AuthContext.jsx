import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [role, setRole] = useState(() => authStorage.getRole());
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(authStorage.getToken()));

  useEffect(() => {
    const handleExpired = () => {
      authStorage.clear();
      setToken(null);
      setRole(null);
      setUser(null);
      setChecking(false);
    };

    window.addEventListener('auth-expired', handleExpired);
    if (!token) {
      setChecking(false);
      return () => window.removeEventListener('auth-expired', handleExpired);
    }

    let active = true;
    api.get('/auth/me')
      .then((result) => {
        if (active) {
          const userRole = result.role || result.user?.role || 'SCIENTIST';
          authStorage.setRole(userRole);
          setRole(userRole);
          setUser(result.user || result);
        }
      })
      .catch((err) => {
        // Only invalidate session if the backend explicitly rejected authentication with 401
        if (active && err?.status === 401) {
          handleExpired();
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
      window.removeEventListener('auth-expired', handleExpired);
    };
  }, [token]);

  const value = useMemo(() => ({
    isAuthenticated: Boolean(token),
    role,
    user,
    checking,
    async signIn(credentials, mode = 'login') {
      const result = await api.post(`/auth/${mode}`, credentials, { skipAuth: true });
      const accessToken = result.accessToken || result.token;
      const userRole = result.role || result.user?.role || 'SCIENTIST';
      
      authStorage.setToken(accessToken);
      authStorage.setRole(userRole);
      setToken(accessToken);
      setRole(userRole);
      setUser(result.user || null);
      setChecking(false);
      return result;
    },
    signOut() {
      api.post('/auth/logout', {}).catch(() => {});
      authStorage.clear();
      setToken(null);
      setRole(null);
      setUser(null);
    },
  }), [checking, role, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

