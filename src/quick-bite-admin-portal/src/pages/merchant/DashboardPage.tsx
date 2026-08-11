import { useAuthStore } from '../../stores/authStore';
import { ClipboardList, DollarSign, Utensils, Star, ArrowUpRight, Clock, Store } from 'lucide-react';

export default function MerchantDashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Đơn Hàng Chờ Xác Nhận', value: '7', change: 'Cần xử lý', icon: ClipboardList, color: 'from-amber-500 to-orange-500' },
    { label: 'Doanh Thu Hôm Nay', value: '4,850,000 ₫', change: '+15%', icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
    { label: 'Món Ăn Đang Mở Bán', value: '32', change: 'Active', icon: Utensils, color: 'from-cyan-500 to-blue-500' },
    { label: 'Đánh Giá Trung Bình', value: '4.9 ★', change: '128 đánh giá', icon: Star, color: 'from-pink-500 to-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Merchant Partner
              </span>
              <span className="text-xs text-slate-400">Email: {user?.email}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100">
              Chào mừng đối tác, {user?.fullName || user?.username || 'Chủ Nhà Hàng'}! 🍳
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Nhà hàng của bạn đang được mở bán trên ứng dụng QuickBite. Lưu ý xác nhận đơn trong 15 phút.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-300">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Trạng thái: Đang mở cửa</span>
          </div>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className={`p-3 bg-gradient-to-br ${stat.color} text-slate-950 rounded-xl font-bold shadow-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="flex items-center text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {stat.change} <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400">{stat.label}</p>
                <p className="text-2xl font-black text-slate-100 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Acceptance Warning / Saga status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Đơn Hàng Mới Chờ Duyệt (Chế độ Saga 15-min Timeout)</span>
          </h3>
          <span className="text-xs text-amber-400 font-bold">Cần duyệt ngay</span>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-400 text-sm">#QB-20260811-9F82</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                  Awaiting Acceptance
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200">2x Cơm Tấm Sườn Bì Chả + 1x Trà Đào Cam Sả</p>
              <p className="text-[11px] text-slate-400">Giao tới: 123 Nguyễn Huệ, Q1 • Tổng: 145,000 ₫</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 transition-all">
                Từ chối
              </button>
              <button className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
                Xác nhận Đơn
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
