import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { restaurantService } from '../services/restaurantService';
import { Store, RefreshCw } from 'lucide-react';

export default function RestaurantGuard() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    let isSubscribed = true;

    const checkRestaurantStatus = async () => {
      if (!user) {
        if (isSubscribed) setIsChecking(false);
        return;
      }

      if (hasRestaurant !== null) {
        if (isSubscribed) setIsChecking(false);
        return;
      }

      const isUuid = (str?: string) =>
        Boolean(str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str));

      const ownerId = isUuid(user?.id) ? user!.id : '3a230201-0ca5-3672-0d1e-500510d2d726';
      const existing = await restaurantService.getRestaurantByOwner(ownerId);

      if (isSubscribed) {
        setHasRestaurant(!!existing);
        setIsChecking(false);
      }
    };

    checkRestaurantStatus();

    return () => {
      isSubscribed = false;
    };
  }, [user, hasRestaurant]);

  if (isChecking) {
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

  const isSetupRoute = location.pathname === '/merchant/setup';

  // If merchant has NO restaurant and is NOT on setup page -> Redirect to /merchant/setup
  if (!hasRestaurant && !isSetupRoute) {
    return <Navigate to="/merchant/setup" replace />;
  }

  // If merchant HAS a restaurant and IS on setup page -> Redirect to /merchant/dashboard
  if (hasRestaurant && isSetupRoute) {
    return <Navigate to="/merchant/dashboard" replace />;
  }

  return <Outlet />;
}
