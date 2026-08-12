import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'boolean' | 'role' | 'order' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'default' }) => {
  const normalized = status?.toLowerCase() || '';

  // 1. Boolean Active / Inactive
  if (type === 'boolean' || normalized === 'active' || normalized === 'inactive' || normalized === 'true' || normalized === 'false') {
    const isActive = normalized === 'active' || normalized === 'true' || status === 'Active';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        {isActive ? 'Hoạt động' : 'Tạm ngưng'}
      </span>
    );
  }

  // 2. Roles: Admin / Merchant / Customer
  if (type === 'role' || normalized === 'admin' || normalized === 'merchant' || normalized === 'customer') {
    if (normalized === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
          🛡️ Admin
        </span>
      );
    }
    if (normalized === 'merchant') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          🏪 Merchant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
        👤 Customer
      </span>
    );
  }

  // 3. Order & Saga Statuses
  if (type === 'order') {
    switch (normalized) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            ⏳ Chờ xử lý
          </span>
        );
      case 'stockreserved':
      case 'confirmed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            📦 Đã xác nhận
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            🍳 Đang chế biến
          </span>
        );
      case 'delivering':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            🛵 Đang giao hàng
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✅ Hoàn tất
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            ❌ Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  }

  // Default pill
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
      {status}
    </span>
  );
};
