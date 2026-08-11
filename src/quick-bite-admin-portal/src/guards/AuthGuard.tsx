import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Role } from '../types';

interface AuthGuardProps {
  allowedRoles?: Role[];
}

export default function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 1. Nếu chưa đăng nhập -> Redirect tới trang /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Nếu đã đăng nhập nhưng không có Role hợp lệ -> Redirect tới trang /unauthorized
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Đúng phân quyền -> Render các Route con bên trong
  return <Outlet />;
}
