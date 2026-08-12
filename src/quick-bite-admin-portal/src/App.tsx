import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BootScreen from './components/BootScreen';
import { useAuthStore } from './stores/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';
import MerchantLayout from './layouts/MerchantLayout';

// Guards
import AuthGuard from './guards/AuthGuard';
import RestaurantGuard from './guards/RestaurantGuard';

// Pages
import LoginPage from './pages/auth/LoginPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import { RestaurantsPage } from './pages/admin/RestaurantsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import MerchantDashboardPage from './pages/merchant/DashboardPage';
import CreateRestaurantPage from './pages/merchant/CreateRestaurantPage';
import MerchantMenuPage from './pages/merchant/MerchantMenuPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

/**
 * Smart Redirect based on authentication state and user role
 */
function SmartRootRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'Merchant') {
    return <Navigate to="/merchant/dashboard" replace />;
  }

  return <Navigate to="/unauthorized" replace />;
}

export default function App() {
  const [isSystemReady, setIsSystemReady] = useState<boolean>(false);

  // Nếu hệ thống microservices chưa sẵn sàng, hiển thị BootScreen (polling API Gateway /health)
  if (!isSystemReady) {
    return <BootScreen onReady={() => setIsSystemReady(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Root Redirect */}
        <Route path="/" element={<SmartRootRedirect />} />

        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<AuthGuard allowedRoles={['Admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="analytics" element={<AdminDashboardPage />} />
            <Route path="settings" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        {/* Protected Merchant Routes */}
        <Route element={<AuthGuard allowedRoles={['Merchant']} />}>
          <Route element={<RestaurantGuard />}>
            <Route path="/merchant/setup" element={<CreateRestaurantPage />} />
            <Route path="/merchant" element={<MerchantLayout />}>
              <Route index element={<Navigate to="/merchant/dashboard" replace />} />
              <Route path="dashboard" element={<MerchantDashboardPage />} />
              <Route path="menu" element={<MerchantMenuPage />} />
              <Route path="orders" element={<MerchantDashboardPage />} />
              <Route path="inventory" element={<MerchantDashboardPage />} />
              <Route path="revenue" element={<MerchantDashboardPage />} />
              <Route path="profile" element={<MerchantDashboardPage />} />
            </Route>
          </Route>
        </Route>

        {/* Status Pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<SmartRootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
