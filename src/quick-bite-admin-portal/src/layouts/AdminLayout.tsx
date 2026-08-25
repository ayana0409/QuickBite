import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UtensilsCrossed,
  Bell,
  Tag,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  canManageUsers,
  canAccessSystemConfig,
  isMerchant,
  getRoleBadgeLabel,
} from '../constants/roles';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = getRoleBadgeLabel(user);

  const allNavItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { to: '/admin/restaurants', label: 'Quản lý Nhà hàng', icon: Store, visible: true },
    { to: '/admin/users', label: 'Quản lý Người dùng', icon: Users, visible: canManageUsers(user) },
    { to: '/admin/orders', label: 'Đơn hàng Hệ thống', icon: ShoppingBag, visible: true },
    { to: '/admin/categories', label: 'Kiểm duyệt Danh mục', icon: Tag, visible: true },
    { to: '/admin/requests', label: 'Xử lý Yêu cầu', icon: Inbox, visible: true },
    { to: '/admin/analytics', label: 'Thống kê & Báo cáo', icon: BarChart3, visible: true },
    { to: '/admin/settings', label: 'Cấu hình Hệ thống', icon: Settings, visible: canAccessSystemConfig(user) },
  ];

  const navItems = allNavItems.filter((item) => item.visible);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 text-slate-100 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Component: Fixed Height, Isolated Scroll */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 h-screen shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Header Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-slate-950 shadow-md">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  QuickBite Admin
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <ShieldCheck className="w-3 h-3" /> System Portal
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info (Always stays pinned at bottom of sidebar) */}
        <div className="p-4 border-t border-slate-800 space-y-3 shrink-0 bg-slate-900">
          {/* Switch to Merchant Portal if user has Merchant role */}
          {isMerchant(user) && (
            <NavLink
              to="/merchant/dashboard"
              className="flex items-center justify-between p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all group"
            >
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Cổng Merchant Portal</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Chuyển ➔</span>
            </NavLink>
          )}

          <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow">
              {user?.fullName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.fullName || 'System Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@quickbite.internal'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area: Fixed Height Container with Scrollable Body */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-base font-bold text-slate-200">
              Quản trị Hệ thống (Admin Portal)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {roleLabel}
            </div>

            {/* Nút Đăng xuất trên Header */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Content Body: Independent Scroll Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
