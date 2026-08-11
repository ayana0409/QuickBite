import { useAuthStore } from '../../stores/authStore';
import { Store, Users, ShoppingBag, DollarSign, ArrowUpRight, ShieldCheck, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Tổng Nhà Hàng Active', value: '48', change: '+12%', icon: Store, color: 'from-amber-500 to-orange-500' },
    { label: 'Tổng Người Dùng System', value: '1,240', change: '+18%', icon: Users, color: 'from-cyan-500 to-blue-500' },
    { label: 'Đơn Hàng Hôm Nay', value: '386', change: '+8%', icon: ShoppingBag, color: 'from-purple-500 to-indigo-500' },
    { label: 'Tổng Doanh Thu Hệ Thống', value: '142.8M ₫', change: '+24%', icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                System Administrator
              </span>
              <span className="text-xs text-slate-400">ID: {user?.id}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100">
              Chào mừng trở lại, {user?.fullName || user?.username || 'Admin'}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống QuickBite Microservices (Gateway, Catalog, Order, Inventory, Payment) đang hoạt động ổn định.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Phân quyền ABP Identity Validated</span>
          </div>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
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

      {/* Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Nhật ký Hoạt động Microservices</span>
            </h3>
            <span className="text-xs text-slate-400">Cập nhật realtime</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-200">Go / NestJS Catalog Service</p>
                <p className="text-slate-400 text-[11px]">Đã đồng bộ 14 món ăn mới vào kho MongoDB cluster</p>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">2 min ago</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-200">.NET 8 Order Saga Service</p>
                <p className="text-slate-400 text-[11px]">Saga #QB-20260811-098A hoàn tất thanh toán VNPay & trừ kho thành công</p>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">5 min ago</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-200">Java Spring Boot Inventory Service</p>
                <p className="text-slate-400 text-[11px]">Pessimistic Locking giải phóng 3 stock items hết timeout</p>
              </div>
              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded">12 min ago</span>
            </div>
          </div>
        </div>

        {/* Admin Permissions Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-base text-slate-100 border-b border-slate-800 pb-3">
            Quyền Hạn Đã Được Cấp (JWT Claims)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {user?.permissions && user.permissions.length > 0 ? (
              user.permissions.map((perm, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-amber-300 rounded-lg text-[11px] font-mono font-semibold"
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">Cấp tất cả quyền SuperAdmin hệ thống</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
