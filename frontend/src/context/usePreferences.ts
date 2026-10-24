import { useContext } from 'react';
import { PreferencesContext, type PreferencesContextType } from './preferences-context';

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
