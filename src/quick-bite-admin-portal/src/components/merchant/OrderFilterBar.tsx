import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { OrderStatus } from '../../types';

export interface OrderFilterValues {
  search: string;
  status: string;
}

export interface OrderFilterBarProps {
  filters: OrderFilterValues;
  onFilterChange: (newFilters: OrderFilterValues) => void;
  className?: string;
}

// Status options mapping for display in Vietnamese
const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ xác nhận (Pending)', value: 'Pending' },
  { label: 'Đã xác nhận (Confirmed)', value: 'Confirmed' },
  { label: 'Đang chuẩn bị (Preparing)', value: 'Preparing' },
  { label: 'Đang giao (Delivering)', value: 'Delivering' },
  { label: 'Đã hoàn thành (Completed)', value: 'Completed' },
  { label: 'Đã hủy (Cancelled)', value: 'Cancelled' },
  { label: 'Đã hoàn tiền (Refunded)', value: 'Refunded' },
];

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  filters,
  onFilterChange,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(filters.search || '');

  // Keep internal input state in sync if parent resets filters
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounce search input changes by 400ms to avoid unnecessary API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({
          ...filters,
          search: searchTerm,
        });
      }
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, filters, onFilterChange]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onFilterChange({
      ...filters,
      search: '',
    });
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all ${className}`}
    >
      {/* Search Bar Input */}
      <div className="relative w-full sm:max-w-xs flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Mã đơn hàng (ví dụ: ORD-2026)..."
          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl border border-slate-200 dark:border-slate-700/60 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Xóa ô tìm kiếm"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Filter Dropdown */}
      <div className="relative w-full sm:w-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Filter className="w-3.5 h-3.5" />
          <span>Trạng thái:</span>
        </div>
        <select
          value={filters.status}
          onChange={handleStatusChange}
          className="w-full sm:w-56 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-sm rounded-xl border border-slate-200 dark:border-slate-700/60 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default OrderFilterBar;
