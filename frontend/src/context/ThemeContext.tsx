import React, { useEffect } from 'react';
import { ThemeContext, type Theme } from './theme-context';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('vectormind-theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // Locked to pure dark theme
  };

  const setTheme = (_t: Theme) => {
    // Locked to pure dark theme
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
