import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BootScreen from './components/BootScreen';
import ToastContainer from './components/common/ToastContainer';
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
import { CategoryModerationPage } from './pages/admin/CategoryModerationPage';
import { RequestsPage } from './pages/admin/RequestsPage';
import { SystemConfig } from './pages/admin/SystemConfig';
import { AdvancedReports } from './pages/admin/AdvancedReports';
import MerchantDashboardPage from './pages/merchant/DashboardPage';
import CreateRestaurantPage from './pages/merchant/CreateRestaurantPage';
import MerchantMenuPage from './pages/merchant/MerchantMenuPage';
import MerchantInventoryPage from './pages/merchant/MerchantInventoryPage';
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage';
import MerchantProfilePage from './pages/merchant/MerchantProfilePage';
import MerchantRevenuePage from './pages/merchant/MerchantRevenuePage';
import MerchantReviewsPage from './pages/merchant/MerchantReviewsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import {
  ADMIN_PORTAL_ROLES,
  USER_MANAGEMENT_ROLES,
  SYSTEM_CONFIG_ROLES,
  MERCHANT_ROLES,
  canAccessAdminPortal,
  isMerchant,
} from './constants/roles';

/**
 * Smart Redirect based on authentication state and user role
 */
function SmartRootRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (canAccessAdminPortal(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (isMerchant(user)) {
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
      <ToastContainer />
      <Routes>
        {/* Public Root Redirect */}
        <Route path="/" element={<SmartRootRedirect />} />

        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Admin Routes: Cho phép Admin, Sub-Admin, Manager */}
        <Route element={<AuthGuard allowedRoles={ADMIN_PORTAL_ROLES} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="categories" element={<CategoryModerationPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="analytics" element={<AdvancedReports />} />

            {/* Quản lý Người dùng: Cho phép Admin & Sub-Admin (Chặn Manager) */}
            <Route element={<AuthGuard allowedRoles={USER_MANAGEMENT_ROLES} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>

            {/* Cấu hình Hệ thống: Chỉ DUY NHẤT Admin được vào */}
            <Route element={<AuthGuard allowedRoles={SYSTEM_CONFIG_ROLES} />}>
              <Route path="settings" element={<SystemConfig />} />
            </Route>
          </Route>
        </Route>

        {/* Protected Merchant Routes */}
        <Route element={<AuthGuard allowedRoles={MERCHANT_ROLES} />}>
          <Route element={<RestaurantGuard />}>
            <Route path="/merchant/setup" element={<CreateRestaurantPage />} />
            <Route path="/merchant" element={<MerchantLayout />}>
              <Route index element={<Navigate to="/merchant/dashboard" replace />} />
              <Route path="dashboard" element={<MerchantDashboardPage />} />
              <Route path="menu" element={<MerchantMenuPage />} />
              <Route path="orders" element={<MerchantOrdersPage />} />
              <Route path="inventory" element={<MerchantInventoryPage />} />
              <Route path="revenue" element={<MerchantRevenuePage />} />
              <Route path="reviews" element={<MerchantReviewsPage />} />
              <Route path="profile" element={<MerchantProfilePage />} />
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
