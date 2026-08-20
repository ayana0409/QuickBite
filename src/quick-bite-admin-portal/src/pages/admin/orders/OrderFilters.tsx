import React from 'react';
import { Search, Calendar, RotateCcw, Filter } from 'lucide-react';

interface OrderFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
  isLoading = false,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
          <Filter className="w-4 h-4 text-amber-400" />
          <span>Bộ lọc nâng cao</span>
        </div>

        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search by Order Code or Customer */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            Tìm kiếm mã đơn / khách hàng
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="VD: QB-2026..., Tên, SĐT..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            Trạng thái đơn hàng
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Draft">Nháp (Draft)</option>
            <option value="Pending">Chờ xử lý (Pending)</option>
            <option value="WaitingInventory">Đang giữ kho (Waiting Inventory)</option>
            <option value="WaitingPayment">Chờ thanh toán (Waiting Payment)</option>
            <option value="WaitingStock">Chờ tồn kho (Waiting Stock)</option>
            <option value="Confirmed">Đã xác nhận (Confirmed)</option>
            <option value="Preparing">Đang chế biến (Preparing)</option>
            <option value="Delivering">Đang giao hàng (Delivering)</option>
            <option value="Completed">Giao thành công (Completed)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
            <option value="Refunded">Đã hoàn tiền (Refunded)</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Từ ngày</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer [color-scheme:dark]"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Đến ngày</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer [color-scheme:dark]"
          />
        </div>
      </div>
    </div>
  );
};
