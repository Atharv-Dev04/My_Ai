import { usePreferences } from './usePreferences';
import type { ThemeContextType } from './theme-context';

export const useTheme = (): ThemeContextType => {
  const { preferences, toggleTheme, updatePreferences } = usePreferences();
  return {
    theme: preferences.theme,
    toggleTheme,
    setTheme: (theme) => updatePreferences({ theme }),
  };
};
