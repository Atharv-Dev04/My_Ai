import { createContext } from 'react';

export type Theme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type DefaultAlgorithm = 'hnsw' | 'kdtree' | 'bruteforce';
export type DefaultMetric = 'cosine' | 'euclidean' | 'manhattan';

export interface UserPreferences {
  theme: Theme;
  density: Density;
  defaultTopK: number;
  defaultAlgorithm: DefaultAlgorithm;
  defaultMetric: DefaultMetric;
  autoRefreshDashboard: boolean;
}

export interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  toggleTheme: () => void;
}

export const defaultPreferences: UserPreferences = {
  theme: 'dark',
  density: 'comfortable',
  defaultTopK: 5,
  defaultAlgorithm: 'hnsw',
  defaultMetric: 'cosine',
  autoRefreshDashboard: true,
};

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);
