import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import { Layout } from './components/layout/Layout';

import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/Home';
import { DashboardPage } from './pages/Dashboard';
import { DocumentsPage } from './pages/Documents';
import { UploadPage } from './pages/Upload';
import { SearchPage } from './pages/Search';
import { ChatPage } from './pages/Chat';
import { AnalyticsPage } from './pages/Analytics';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* App Workspace Routes */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PreferencesProvider>
  );
};

export default App;
