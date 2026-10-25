import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState(() => {
    try {
      const stored = sessionStorage.getItem('hp_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Synchronize Axios default header and fetch profile whenever credentials change or initialize
  useEffect(() => {
    let active = true;
    if (credentials?.email && credentials?.password) {
      setAuthToken(credentials.email, credentials.password);
      api.get('/users/me')
        .then(({ data }) => {
          if (active) {
            setUser(data.data || null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            logout();
            setLoading(false);
          }
        });
    } else {
      clearAuthToken();
      setUser(null);
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [credentials]);

  const login = async (email, password) => {
    setAuthToken(email, password);
    try {
      const { data } = await api.get('/users/me');
      const creds = { email, password };
      try {
        sessionStorage.setItem('hp_auth', JSON.stringify(creds));
      } catch {
        // sessionStorage unavailable fallback
      }
      setCredentials(creds);
      setUser(data.data);
      return data.data;
    } catch (err) {
      clearAuthToken();
      throw err;
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem('hp_auth');
    } catch {
      // ignore
    }
    clearAuthToken();
    setCredentials(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        credentials,
        loading,
        login,
        logout,
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
