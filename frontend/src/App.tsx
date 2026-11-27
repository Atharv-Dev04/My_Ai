import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { Skeleton } from './components/common/Skeleton';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatPage } from './pages/Chat';

// Lazy-loaded secondary workspace routes
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const DocumentsPage = lazy(() => import('./pages/Documents').then((m) => ({ default: m.DocumentsPage })));
const UploadPage = lazy(() => import('./pages/Upload').then((m) => ({ default: m.UploadPage })));
const SearchPage = lazy(() => import('./pages/Search').then((m) => ({ default: m.SearchPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })));

const RouteLoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', maxWidth: '48rem', margin: '0 auto', width: '100%' }}>
    <Skeleton height="3rem" />
    <Skeleton height="12rem" />
    <Skeleton height="8rem" />
  </div>
);

export const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Formal Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main Application Workspace with Chat as Home Screen */}
            <Route path="/" element={<Layout />}>
              {/* Home Screen is directly the ChatGPT / Claude Chat interface */}
              <Route index element={<ChatPage />} />
              <Route path="chat" element={<Navigate to="/" replace />} />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="documents"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DocumentsPage />
                  </Suspense>
                }
              />
              <Route
                path="upload"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <UploadPage />
                  </Suspense>
                }
              />
              <Route
                path="search"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <SearchPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Legacy redirect for /app paths */}
            <Route path="/app/*" element={<Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
};

export default App;
