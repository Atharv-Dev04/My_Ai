import React, { useEffect, useState } from 'react';
import {
  PreferencesContext,
  defaultPreferences,
  type UserPreferences,
} from './preferences-context';

const STORAGE_KEY = 'vectormind-user-preferences';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      ...defaultPreferences,
      theme: prefersDark ? 'dark' : 'light',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      document.documentElement.setAttribute('data-theme', preferences.theme);
      document.documentElement.setAttribute('data-density', preferences.density);
    } catch {
      // ignore
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferencesState((prev) => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferencesState(defaultPreferences);
  };

  const toggleTheme = () => {
    setPreferencesState((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        toggleTheme,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
