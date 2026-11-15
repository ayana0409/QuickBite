import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRestaurantStore } from '../stores/restaurantStore';
import { Store, RefreshCw } from 'lucide-react';

/**
 * Route guard for operational merchant pages (/merchant/*).
 * Ensures the logged-in merchant owns an active restaurant before granting access.
 * Redirects to /merchant/setup if no active restaurant is found.
 */
export default function RestaurantGuard() {
  const { user } = useAuthStore();
  const { restaurant, hasRestaurant, isLoading, fetchMyRestaurant } = useRestaurantStore();

  const isUuid = (str?: string) =>
    Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

  const ownerId = isUuid(user?.id) ? user!.id : '3a230201-0ca5-3672-0d1e-500510d2d726';

  useEffect(() => {
    // Only fetch if status hasn't been determined yet
    if (user && hasRestaurant === null && !isLoading) {
      fetchMyRestaurant(ownerId);
    }
  }, [user, ownerId, hasRestaurant, isLoading, fetchMyRestaurant]);

  // Render loading state while checking restaurant existence
  if (isLoading || hasRestaurant === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <Store className="w-8 h-8 text-emerald-400 animate-bounce" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Đang kiểm tra hồ sơ nhà hàng đối tác...</span>
        </div>
      </div>
    );
  }

  // If merchant has no approved restaurant yet, redirect to setup / onboarding page
  if (!hasRestaurant || !restaurant) {
    return <Navigate to="/merchant/setup" replace />;
  }

  // Merchant has an active restaurant -> render operational pages
  return <Outlet />;
}
