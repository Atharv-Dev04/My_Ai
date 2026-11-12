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
    // Use Dark Professional as the first-visit default per architectural spec
    return {
      ...defaultPreferences,
      theme: 'dark',
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
    setPreferencesState((prev) => {
      const cycle: Record<string, typeof prev.theme> = {
        dark: 'light',
        light: 'warm',
        warm: 'glass',
        glass: 'dark',
      };
      return {
        ...prev,
        theme: cycle[prev.theme] || 'dark',
      };
    });
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
