import React from 'react';
import {
  ADMIN_ROLES,
  SUB_ADMIN_ROLES,
  MANAGER_ROLES,
  MERCHANT_ROLES,
  hasRoleMatch,
} from '../../constants/roles';

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

  // 2. Roles: Admin / Sub-Admin / Manager / Merchant / Customer
  const isRoleAdmin = hasRoleMatch([normalized], ADMIN_ROLES);
  const isRoleSubAdmin = hasRoleMatch([normalized], SUB_ADMIN_ROLES);
  const isRoleManager = hasRoleMatch([normalized], MANAGER_ROLES);
  const isRoleMerchant = hasRoleMatch([normalized], MERCHANT_ROLES);

  if (type === 'role' || isRoleAdmin || isRoleSubAdmin || isRoleManager || isRoleMerchant || normalized === 'customer') {
    if (isRoleAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
          🛡️ Admin
        </span>
      );
    }
    if (isRoleSubAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
          🔹 Sub-Admin
        </span>
      );
    }
    if (isRoleManager) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-sky-500/10 text-sky-300 border border-sky-500/30">
          👔 Manager
        </span>
      );
    }
    if (isRoleMerchant) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          🏪 Merchant
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700">
        👤 {status}
      </span>
    );
  }

  // 3. Order & Saga Statuses
  if (type === 'order') {
    switch (normalized) {
      case 'draft':
      case 'waitinginventory':
      case 'waitingstock':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            📝 Chờ xác nhận (nháp)
          </span>
        );
      case 'waitingpayment':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            💳 Chờ thanh toán
          </span>
        );
      case 'pending':
      case 'stockreserved':
      case 'confirmed':
      case 'awaitingrestaurantacceptance':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            📦 Đã xác nhận
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            🍳 Đang chuẩn bị
          </span>
        );
      case 'delivering':
      case 'ontheway':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            🛵 Đang giao hàng
          </span>
        );
      case 'completed':
      case 'delivered':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            ✅ Giao thành công
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
            ❌ Đã hủy
          </span>
        );
      case 'refunded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
            💸 Đã hoàn tiền
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
