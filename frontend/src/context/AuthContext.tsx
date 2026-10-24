import React, { useState, useEffect } from 'react';
import { type UserProfile, getMe, loginUser, registerUser } from '../api/client';
import { AuthContext } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vectormind_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadUser() {
      const currentToken = localStorage.getItem('vectormind_token');
      if (!currentToken) {
        if (!isCancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const profile = await getMe();
        if (!isCancelled) {
          setUser(profile);
        }
      } catch {
        if (!isCancelled) {
          localStorage.removeItem('vectormind_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const resp = await loginUser(email, password);
    localStorage.setItem('vectormind_token', resp.access_token);
    setToken(resp.access_token);
    const profile = await getMe();
    setUser(profile);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await registerUser(email, password, fullName);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('vectormind_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const profile = await getMe();
    setUser(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
