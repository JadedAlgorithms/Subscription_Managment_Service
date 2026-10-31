import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { SubscriptionBuilderPage } from './pages/admin/SubscriptionBuilderPage';
import { BillingCenterPage } from './pages/admin/BillingCenterPage';
import { DiscountsPage } from './pages/admin/DiscountsPage';
import { FinanceDashboardPage } from './pages/admin/FinanceDashboardPage';
import { CustomerPortalPage } from './pages/portal/CustomerPortalPage';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

/**
 * App Shell Layout with Navbar and Role-Aware Sidebar
 */
const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

/**
 * Smart Index Redirector based on Authenticated Role
 */
const RootRedirector: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
        <span className="text-xs font-mono">Initializing Brightloop engine...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === UserRole.CUSTOMER) {
    return <Navigate to="/portal/subscriptions" replace />;
  }

  return <Navigate to="/admin/products" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirector />} />

          {/* Protected Internal Admin / Staff Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.STAFF]}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/products" element={<ProductsPage />} />
            <Route path="/admin/subscriptions/new" element={<SubscriptionBuilderPage />} />
            <Route path="/admin/subscriptions" element={<SubscriptionBuilderPage />} />
            <Route path="/admin/billing" element={<BillingCenterPage />} />
            <Route path="/admin/discounts" element={<DiscountsPage />} />
            <Route path="/admin/finance" element={<FinanceDashboardPage />} />
          </Route>

          {/* Protected Customer Portal Routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/portal" element={<Navigate to="/portal/subscriptions" replace />} />
            <Route
              path="/portal/subscriptions"
              element={<CustomerPortalPage initialTab="subscriptions" />}
            />
            <Route
              path="/portal/invoices"
              element={<CustomerPortalPage initialTab="invoices" />}
            />
          </Route>

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
