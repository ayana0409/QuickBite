import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getUserRoles, hasRoleMatch } from '../constants/roles';
import type { Role } from '../types';

interface AuthGuardProps {
  allowedRoles?: readonly (Role | string)[];
}

export default function AuthGuard({ allowedRoles }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 1. Nếu chưa đăng nhập -> Redirect tới trang /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Nếu đã đăng nhập nhưng không có Role hợp lệ trong danh sách phân quyền -> Redirect tới /unauthorized
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = getUserRoles(user);
    const hasPermission = hasRoleMatch(userRoles, allowedRoles);

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 3. Đúng phân quyền -> Render các Route con bên trong
  return <Outlet />;
}

