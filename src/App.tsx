import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { EstablishmentPage } from './pages/dashboard/EstablishmentPage';
import { CategoriesPage } from './pages/dashboard/CategoriesPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { MenuScannerPage } from './pages/dashboard/MenuScannerPage';
import { ThemesPage } from './pages/dashboard/ThemesPage';
import { QrCodePage } from './pages/dashboard/QrCodePage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { PublicMenuPage } from './pages/public/PublicMenuPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Root index redirector
const RootRedirector: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Customer Menu Route (Strictly No Auth Required) */}
          <Route path="/r/:slug" element={<PublicMenuPage />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirector />} />

          {/* Protected Restaurant Admin Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHomePage />} />
            <Route path="establishment" element={<EstablishmentPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="scanner" element={<MenuScannerPage />} />
            <Route path="themes" element={<ThemesPage />} />
            <Route path="qr-code" element={<QrCodePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<RootRedirector />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
