import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PreferencesProvider } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { Skeleton } from './components/common/Skeleton';

// Immediate primary landing and entry routes
import { LandingPage } from './pages/LandingPage';
import { HomePage } from './pages/Home';

// Lazy-loaded secondary workspace routes for bundle optimization
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const DocumentsPage = lazy(() => import('./pages/Documents').then((m) => ({ default: m.DocumentsPage })));
const UploadPage = lazy(() => import('./pages/Upload').then((m) => ({ default: m.UploadPage })));
const SearchPage = lazy(() => import('./pages/Search').then((m) => ({ default: m.SearchPage })));
const ChatPage = lazy(() => import('./pages/Chat').then((m) => ({ default: m.ChatPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));

const RouteLoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
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
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* App Workspace Routes with Suspense boundaries */}
            <Route path="/app" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DashboardPage />
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
                path="chat"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <ChatPage />
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
              <Route
                path="profile"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
};

export default App;
