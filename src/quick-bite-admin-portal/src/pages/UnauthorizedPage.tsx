import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function UnauthorizedPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (user?.role === 'Admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (user?.role === 'Merchant') {
      navigate('/merchant/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative z-10">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400 shadow-xl shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-xs font-black uppercase tracking-wider">
            403 Access Denied
          </span>
          <h1 className="text-2xl font-black text-slate-100">Không Có Quyền Truy Cập</h1>
          <p className="text-xs text-slate-400">
            Tài khoản hiện tại của bạn (<span className="text-amber-400 font-semibold">{user?.email || user?.username}</span>) có vai trò là <span className="text-amber-400 font-extrabold uppercase">{user?.role || 'Khách'}</span>, không có thẩm quyền truy cập trang này.
          </p>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
          <p className="font-bold text-slate-300">Yêu cầu truy cập:</p>
          <ul className="list-disc list-inside text-slate-400 space-y-0.5">
            <li>Kênh Admin: Chỉ cho phép tài khoản Admin (`role: Admin`)</li>
            <li>Kênh Merchant: Chỉ cho phép tài khoản Merchant (`role: Merchant`)</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoHome}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Trang Chủ Phù Hợp</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Đổi Tài Khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
}
