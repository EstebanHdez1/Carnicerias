import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('carniceria_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('carniceria_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('carniceria_user', JSON.stringify(res.user));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out');
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('carniceria_token', res.token);
      localStorage.setItem('carniceria_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error('Respuesta inválida del servidor');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('carniceria_token');
    localStorage.removeItem('carniceria_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'ADMIN',
        isVendor: user?.role === 'VENDEDOR',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
